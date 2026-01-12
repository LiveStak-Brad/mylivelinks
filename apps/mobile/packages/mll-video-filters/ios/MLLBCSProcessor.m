#import "MLLBCSProcessor.h"

#import <CoreImage/CoreImage.h>
#import <WebRTC/RTCCVPixelBuffer.h>
#import <WebRTC/RTCVideoFrame.h>

// Shared params (defaults 1.0)
static float gBrightness = 1.0f;
static float gContrast = 1.0f;
static float gSaturation = 1.0f;
static int gSoftSkinLevel = 0;

void MLLSetBCSParams(float brightness, float contrast, float saturation) {
  gBrightness = brightness;
  gContrast = contrast;
  gSaturation = saturation;
}

void MLLSetSoftSkinLevel(int level) {
  if (level < 0) level = 0;
  if (level > 2) level = 2;
  if (gSoftSkinLevel != level) {
    gSoftSkinLevel = level;
#if DEBUG
    NSLog(@"[MLLVideoFilters] softSkinLevel=%d", gSoftSkinLevel);
#endif
  }
}

@implementation MLLBCSProcessor {
  CIContext *_ciContext;
  CFAbsoluteTime _lastLogTime;
}

- (instancetype)init {
  self = [super init];
  if (self) {
    _ciContext = [CIContext contextWithOptions:nil];
    _lastLogTime = 0;
  }
  return self;
}

- (RTCVideoFrame *)capturer:(RTCVideoCapturer *)capturer didCaptureVideoFrame:(RTCVideoFrame *)frame {
  id<RTCVideoFrameBuffer> buffer = frame.buffer;

  // We only process CVPixelBuffer-backed frames for now.
  if (![buffer isKindOfClass:[RTCCVPixelBuffer class]]) {
    return frame;
  }

  // Identity bypass: if user is effectively "off", return original frame untouched.
  // This avoids extra CI render passes and prevents subtle color/softness artifacts.
  if (gSoftSkinLevel == 0 &&
      fabsf(gBrightness - 1.0f) < 0.0001f &&
      fabsf(gContrast - 1.0f) < 0.0001f &&
      fabsf(gSaturation - 1.0f) < 0.0001f) {
    return frame;
  }

  RTCCVPixelBuffer *cvBuf = (RTCCVPixelBuffer *)buffer;
  CVPixelBufferRef pixelBuffer = cvBuf.pixelBuffer;
  if (pixelBuffer == nil) {
    return frame;
  }

  CIImage *inputImage = [CIImage imageWithCVPixelBuffer:pixelBuffer];
  if (!inputImage) {
    return frame;
  }

  CIFilter *filter = [CIFilter filterWithName:@"CIColorControls"];
  [filter setValue:inputImage forKey:kCIInputImageKey];

  // Map web-style params (1.0 = normal).
  // CIColorControls brightness is additive in [-1..1], so we map (brightness - 1).
  [filter setValue:@(gSaturation) forKey:kCIInputSaturationKey];
  [filter setValue:@(gContrast) forKey:kCIInputContrastKey];
  [filter setValue:@(gBrightness - 1.0f) forKey:kCIInputBrightnessKey];

  CIImage *outputImage = filter.outputImage;
  if (!outputImage) {
    return frame;
  }

  // Optional global soft skin: small gaussian blur, cropped back to original extent.
  if (gSoftSkinLevel > 0) {
    // Keep radius small for stable performance.
    // Use blending with original to avoid obvious background "glow/bleed".
    const CGFloat radius = (gSoftSkinLevel == 1) ? 1.0 : 2.0;
    CIFilter *blur = [CIFilter filterWithName:@"CIGaussianBlur"];
    [blur setValue:outputImage forKey:kCIInputImageKey];
    [blur setValue:@(radius) forKey:kCIInputRadiusKey];
    CIImage *blurred = blur.outputImage;
    if (blurred) {
      CIImage *cropped = [blurred imageByCroppingToRect:inputImage.extent];

      // Set alpha on blurred image (global blend amount)
      const CGFloat amount = (gSoftSkinLevel == 1) ? 0.25 : 0.40;
      CIFilter *alpha = [CIFilter filterWithName:@"CIColorMatrix"];
      [alpha setValue:cropped forKey:kCIInputImageKey];
      // Multiply alpha by amount
      [alpha setValue:[CIVector vectorWithX:0 Y:0 Z:0 W:amount] forKey:@"inputAVector"];
      [alpha setValue:[CIVector vectorWithX:0 Y:0 Z:0 W:0] forKey:@"inputBiasVector"];
      CIImage *blurWithAlpha = alpha.outputImage ?: cropped;

      CIFilter *comp = [CIFilter filterWithName:@"CISourceOverCompositing"];
      [comp setValue:blurWithAlpha forKey:kCIInputImageKey];
      [comp setValue:outputImage forKey:kCIInputBackgroundImageKey];
      CIImage *mixed = comp.outputImage;
      if (mixed) {
        outputImage = [mixed imageByCroppingToRect:inputImage.extent];
      } else {
        outputImage = cropped;
      }
    }
  }

  const size_t width = CVPixelBufferGetWidth(pixelBuffer);
  const size_t height = CVPixelBufferGetHeight(pixelBuffer);

#if DEBUG
  CFAbsoluteTime now = CFAbsoluteTimeGetCurrent();
  if (now - _lastLogTime > 2.0) {
    _lastLogTime = now;
    NSLog(@"[MLLVideoFilters] processor active: %zux%zu softSkinLevel=%d", width, height, gSoftSkinLevel);
  }
#endif

  NSDictionary *attrs = @{
    (NSString *)kCVPixelBufferCGImageCompatibilityKey: @YES,
    (NSString *)kCVPixelBufferCGBitmapContextCompatibilityKey: @YES,
  };

  CVPixelBufferRef outBuffer = NULL;
  CVReturn ret = CVPixelBufferCreate(kCFAllocatorDefault, (size_t)width, (size_t)height,
                                     kCVPixelFormatType_32BGRA, (__bridge CFDictionaryRef)attrs, &outBuffer);
  if (ret != kCVReturnSuccess || outBuffer == NULL) {
    return frame;
  }

  CGColorSpaceRef cs = CGColorSpaceCreateDeviceRGB();
  [_ciContext render:outputImage toCVPixelBuffer:outBuffer bounds:CGRectMake(0, 0, width, height) colorSpace:cs];
  CGColorSpaceRelease(cs);

  RTCCVPixelBuffer *newBuf = [[RTCCVPixelBuffer alloc] initWithPixelBuffer:outBuffer];
  RTCVideoFrame *newFrame = [[RTCVideoFrame alloc] initWithBuffer:newBuf rotation:frame.rotation timeStampNs:frame.timeStampNs];
  CFRelease(outBuffer);
  return newFrame;
}

@end

