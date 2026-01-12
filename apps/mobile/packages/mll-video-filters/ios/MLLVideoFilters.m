#import "MLLVideoFilters.h"

#import "MLLBCSProcessor.h"
#import "ProcessorProvider.h"

// Forward declaration from MLLBCSProcessor.m
extern void MLLSetBCSParams(float brightness, float contrast, float saturation);
extern void MLLSetSoftSkinLevel(int level);

@implementation MLLVideoFilters

RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(install)
{
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    MLLBCSProcessor *processor = [[MLLBCSProcessor alloc] init];
    [ProcessorProvider addProcessor:processor forName:@"mll_bcs"];
  });
}

RCT_EXPORT_METHOD(setFilterParams:(NSDictionary *)params)
{
  NSNumber *b = params[@"brightness"];
  NSNumber *c = params[@"contrast"];
  NSNumber *s = params[@"saturation"];
  NSNumber *ss = params[@"softSkinLevel"];

  if (b && c && s) {
    MLLSetBCSParams([b floatValue], [c floatValue], [s floatValue]);
  }
  if (ss) {
    MLLSetSoftSkinLevel([ss intValue]);
  }
}

@end

