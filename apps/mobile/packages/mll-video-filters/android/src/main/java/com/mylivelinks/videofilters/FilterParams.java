package com.mylivelinks.videofilters;

public final class FilterParams {
  // Defaults per spec: 1.0, 1.0, 1.0
  public static volatile float brightness = 1.0f;
  public static volatile float contrast = 1.0f;
  public static volatile float saturation = 1.0f;
  // Soft skin: 0=off, 1=low, 2=medium
  public static volatile int softSkinLevel = 0;

  private FilterParams() {}
}

