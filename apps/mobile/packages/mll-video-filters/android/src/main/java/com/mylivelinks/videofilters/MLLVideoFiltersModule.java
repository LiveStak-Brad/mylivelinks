package com.mylivelinks.videofilters;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.oney.WebRTCModule.videoEffects.ProcessorProvider;
import android.util.Log;

public class MLLVideoFiltersModule extends ReactContextBaseJavaModule {
  private static final String NAME = "MLLVideoFilters";
  private static boolean installed = false;
  private static int lastSoftSkinLevel = Integer.MIN_VALUE;

  public MLLVideoFiltersModule(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @NonNull
  @Override
  public String getName() {
    return NAME;
  }

  @ReactMethod
  public void install() {
    if (installed) return;
    installed = true;
    // Register processor factory under a stable name
    ProcessorProvider.addProcessor("mll_bcs", new BCSProcessorFactory());
    Log.i("MLLVideoFilters", "Installed processor: mll_bcs");
  }

  @ReactMethod
  public void setFilterParams(ReadableMap params) {
    if (params == null) return;
    if (params.hasKey("brightness")) {
      FilterParams.brightness = (float) params.getDouble("brightness");
    }
    if (params.hasKey("contrast")) {
      FilterParams.contrast = (float) params.getDouble("contrast");
    }
    if (params.hasKey("saturation")) {
      FilterParams.saturation = (float) params.getDouble("saturation");
    }
    if (params.hasKey("softSkinLevel")) {
      FilterParams.softSkinLevel = (int) Math.round(params.getDouble("softSkinLevel"));
    }
    // Log only on changes (avoid spam)
    if (FilterParams.softSkinLevel != lastSoftSkinLevel) {
      lastSoftSkinLevel = FilterParams.softSkinLevel;
      Log.i(
        "MLLVideoFilters",
        "setFilterParams: b=" + FilterParams.brightness +
          " c=" + FilterParams.contrast +
          " s=" + FilterParams.saturation +
          " softSkinLevel=" + FilterParams.softSkinLevel
      );
    }
  }
}

