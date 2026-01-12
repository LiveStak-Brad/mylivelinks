package com.mylivelinks.videofilters;

import com.oney.WebRTCModule.videoEffects.VideoFrameProcessor;
import org.webrtc.JavaI420Buffer;
import org.webrtc.SurfaceTextureHelper;
import org.webrtc.VideoFrame;
import org.webrtc.VideoFrame.I420Buffer;
import android.util.Log;

/**
 * CPU YUV processor:
 * - brightness/contrast are applied to luma (Y)
 * - saturation is applied to chroma (U/V)
 *
 * This runs on the capturer thread; keep it simple and allocation-light.
 */
public class BrightnessContrastSaturationProcessor implements VideoFrameProcessor {
  private static int clamp255(int v) {
    if (v < 0) return 0;
    if (v > 255) return 255;
    return v;
  }

  private byte[] yTemp;
  private int yTempSize = 0;
  private byte[] yOrig;
  private int yOrigSize = 0;
  private long lastLogMs = 0;

  private void ensureYTemp(int size) {
    if (yTemp == null || yTempSize != size) {
      yTemp = new byte[size];
      yTempSize = size;
    }
  }

  private void ensureYOrig(int size) {
    if (yOrig == null || yOrigSize != size) {
      yOrig = new byte[size];
      yOrigSize = size;
    }
  }

  /**
   * Very small global smoothing pass on the luma plane (Y).
   * Uses a cheap 5-tap blur (center weighted) to avoid heavy CPU cost.
   */
  private void softSkinPass(java.nio.ByteBuffer yPlane, int width, int height, int stride) {
    final int size = stride * height;
    ensureYTemp(size);

    // Source reads from yPlane, output into yTemp, then we copy back.
    for (int row = 0; row < height; row++) {
      final int rowOff = row * stride;
      for (int col = 0; col < width; col++) {
        final int idx = rowOff + col;

        // Keep borders unchanged.
        if (row == 0 || col == 0 || row == height - 1 || col == width - 1) {
          yTemp[idx] = yPlane.get(idx);
          continue;
        }

        final int c = yPlane.get(idx) & 0xFF;
        final int n = yPlane.get(idx - stride) & 0xFF;
        final int s = yPlane.get(idx + stride) & 0xFF;
        final int w = yPlane.get(idx - 1) & 0xFF;
        final int e = yPlane.get(idx + 1) & 0xFF;

        // Weighted 5-tap (center x4) => divide by 8
        final int v = (c * 4 + n + s + w + e) >> 3;
        yTemp[idx] = (byte) v;
      }
    }

    // Copy back to direct buffer.
    yPlane.position(0);
    yPlane.put(yTemp, 0, size);
    yPlane.position(0);
  }

  private void blendY(java.nio.ByteBuffer yPlane, int width, int height, int stride, float amount) {
    // Blend blurred result (currently in yPlane) with the original Y stored in yOrig.
    // amount: 0..1 (higher = smoother/softer)
    final int size = stride * height;
    if (yOrig == null || yOrigSize != size) return;
    final int a = Math.max(0, Math.min(255, Math.round(amount * 255f)));
    final int invA = 255 - a;
    for (int row = 0; row < height; row++) {
      final int rowOff = row * stride;
      for (int col = 0; col < width; col++) {
        final int idx = rowOff + col;
        final int orig = yOrig[idx] & 0xFF;
        final int blur = yPlane.get(idx) & 0xFF;
        final int v = (orig * invA + blur * a + 127) / 255;
        yPlane.put(idx, (byte) v);
      }
    }
  }

  @Override
  public VideoFrame process(VideoFrame frame, SurfaceTextureHelper textureHelper) {
    final float brightness = FilterParams.brightness;
    final float contrast = FilterParams.contrast;
    final float saturation = FilterParams.saturation;
    final int softSkinLevel = FilterParams.softSkinLevel;

    // Identity bypass: if user is effectively "off", return original frame untouched.
    // This avoids unnecessary CPU work and prevents subtle color conversion artifacts.
    if (softSkinLevel == 0 &&
      Math.abs(brightness - 1.0f) < 0.0001f &&
      Math.abs(contrast - 1.0f) < 0.0001f &&
      Math.abs(saturation - 1.0f) < 0.0001f) {
      return frame;
    }

    final VideoFrame.Buffer buffer = frame.getBuffer();
    final I420Buffer i420 = buffer.toI420();
    final int width = i420.getWidth();
    final int height = i420.getHeight();

    // Throttled runtime proof that processor is active (every ~2s)
    final long nowMs = android.os.SystemClock.elapsedRealtime();
    if (nowMs - lastLogMs > 2000) {
      lastLogMs = nowMs;
      Log.d(
        "MLLVideoFilters",
        "processor active: " + width + "x" + height + " softSkinLevel=" + softSkinLevel
      );
    }

    final JavaI420Buffer out = JavaI420Buffer.allocate(width, height);

    // Y plane
    final int yStrideIn = i420.getStrideY();
    final int yStrideOut = out.getStrideY();
    final java.nio.ByteBuffer yIn = i420.getDataY();
    final java.nio.ByteBuffer yOut = out.getDataY();
    for (int row = 0; row < height; row++) {
      final int inRow = row * yStrideIn;
      final int outRow = row * yStrideOut;
      for (int col = 0; col < width; col++) {
        int y = yIn.get(inRow + col) & 0xFF;
        // Contrast around mid-point, then brightness multiplier
        float yf = (y - 128f) * contrast + 128f;
        yf = yf * brightness;
        yOut.put(outRow + col, (byte) clamp255(Math.round(yf)));
      }
    }

    // Optional global smoothing on luma after B/C is applied.
    // To avoid "foreground color bleed" artifacts, we blur lightly and then blend with the original.
    if (softSkinLevel > 0) {
      final int size = yStrideOut * height;
      ensureYOrig(size);
      // Snapshot original (post B/C) luma.
      yOut.position(0);
      yOut.get(yOrig, 0, size);
      yOut.position(0);

      // Blur pass (keep it small and stable)
      softSkinPass(yOut, width, height, yStrideOut);

      final float amount = (softSkinLevel == 1) ? 0.35f : 0.55f;
      blendY(yOut, width, height, yStrideOut, amount);
    }

    // U/V planes (4:2:0)
    final int cw = (width + 1) / 2;
    final int ch = (height + 1) / 2;

    final int uStrideIn = i420.getStrideU();
    final int vStrideIn = i420.getStrideV();
    final int uStrideOut = out.getStrideU();
    final int vStrideOut = out.getStrideV();
    final java.nio.ByteBuffer uIn = i420.getDataU();
    final java.nio.ByteBuffer vIn = i420.getDataV();
    final java.nio.ByteBuffer uOut = out.getDataU();
    final java.nio.ByteBuffer vOut = out.getDataV();

    for (int row = 0; row < ch; row++) {
      final int uInRow = row * uStrideIn;
      final int vInRow = row * vStrideIn;
      final int uOutRow = row * uStrideOut;
      final int vOutRow = row * vStrideOut;
      for (int col = 0; col < cw; col++) {
        int u = uIn.get(uInRow + col) & 0xFF;
        int v = vIn.get(vInRow + col) & 0xFF;
        float uf = (u - 128f) * saturation + 128f;
        float vf = (v - 128f) * saturation + 128f;
        uOut.put(uOutRow + col, (byte) clamp255(Math.round(uf)));
        vOut.put(vOutRow + col, (byte) clamp255(Math.round(vf)));
      }
    }

    i420.release();

    return new VideoFrame(out, frame.getRotation(), frame.getTimestampNs());
  }
}

