require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name         = 'mll-video-filters'
  s.version      = package['version']
  s.summary      = 'MyLiveLinks native video filters (brightness/contrast/saturation)'
  s.homepage     = 'https://mylivelinks.com'
  s.license      = 'UNLICENSED'
  s.author       = 'MyLiveLinks'
  s.platforms    = { :ios => '12.0' }
  s.source       = { :path => '.' }

  s.source_files = 'ios/**/*.{h,m,mm,swift}'

  s.dependency 'React-Core'
  s.dependency 'livekit-react-native-webrtc'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES'
  }
end

