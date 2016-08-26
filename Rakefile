# Rakefile for TimeWarp
# Copyright 2014 Mohit Cheppudira <mohit@muthanna.com>

require "bundler/setup"
require 'fileutils'
require 'rake/testtask'

DIR = File.dirname(__FILE__)
DEPLOY_SSH_SERVER = "mohit@vexflow.com"
DEPLOY_DIR = "/home/mohit/www/vexflow/vexwarp"

COFFEE = "node_modules/.bin/coffee"

directory 'build/public'
directory 'build/public/css'
directory 'build/public/css/support'
directory 'build/public/fonts'
directory 'build/public/images'
directory 'build/public/js'
directory 'build/public/js/support'
directory 'build/chrome'
directory 'build/chrome/css'
directory 'build/chrome/js'
directory 'build/chrome/js/support'
directory 'build/chrome/fonts'

def ssh(command)
  sh "ssh #{DEPLOY_SSH_SERVER} 'source ~/.bash_profile; cd #{DEPLOY_DIR}; #{command}'"
end

def copy_path(path_glob, dest_dir, name)
  FileList[path_glob].each do |source|
    target = "#{dest_dir}/#{File.basename(source)}"
    file target => [source, dest_dir] do
      cp source, target, :verbose => true
    end

    desc "Copy data in: #{path_glob}"
    task name => target
  end
end

file 'build/public/js/timewarp-min.js' => :build_copy do
  system "./node_modules/requirejs/bin/r.js -o src/build.js"
end

copy_path("www/*.html", "build/public", :build_copy)
copy_path("www/css/*.css", "build/public/css", :build_copy)
copy_path("www/images/*", "build/public/images", :build_copy)
copy_path("src/*", "build/public/js", :build_copy)
copy_path("support/js/*.js", "build/public/js/support", :build_copy)
copy_path("support/css/*.css", "build/public/css", :build_copy)
copy_path("support/fonts/*", "build/public/fonts", :build_copy)

copy_path("www/*.html", "build/chrome", :chrome_build)
copy_path("chrome/*", "build/chrome", :chrome_build)
copy_path("www/css/*.css", "build/chrome/css", :chrome_build)
copy_path("support/css/*.css", "build/chrome/css", :chrome_build)
copy_path("support/fonts/*", "build/chrome/fonts", :chrome_build)
copy_path("build/public/js/timewarp-min.js", "build/chrome/js", :chrome_build)
copy_path("support/js/require.js", "build/chrome/js/support", :build_copy)

file 'build/vexwarp-chrome.zip' => [:chrome_build, 'build/public/js/timewarp-min.js'] do
  sh "zip -r build/vexwarp-chrome.zip build/chrome/*"
end

task :lint do
  command = "jsl "
  FileList['src/*.js'].reject {|x| x == "src/build.js"}.each do |source|
    command += " -process #{source}"
  end

  system command
end

task :clean do
  sh 'rm -rf build'
end

task :watch do
  sh 'bundle exec guard -i'
end

task :make => [:build_copy, 'build/public/js/timewarp-min.js']

# Publish chrome app to:
# https://developers.google.com/chrome/web-store/docs/publish
task :app => [:clean, 'build/vexwarp-chrome.zip']

task :deploy => [:clean, :make] do
  sh "rsync -przvl --executability --delete --stats build/public/* #{DEPLOY_SSH_SERVER}:#{DEPLOY_DIR}"
  ssh "rm js/graph.js js/stretch.js js/main.js js/build.js js/warp.js js/tools.js js/app.js js/support/dsp.js"
end

task :default => [:make]
