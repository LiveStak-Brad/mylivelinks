package com.mylivelinks.videofilters;

import com.oney.WebRTCModule.videoEffects.VideoFrameProcessor;
import com.oney.WebRTCModule.videoEffects.VideoFrameProcessorFactoryInterface;

public class BCSProcessorFactory implements VideoFrameProcessorFactoryInterface {
  @Override
  public VideoFrameProcessor build() {
    return new BrightnessContrastSaturationProcessor();
  }
}

