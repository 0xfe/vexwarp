# Build if anything in src/ changes.
#
# Run from project root directory:
#
#     $ bundle exec guard

guard :bundler do
  watch('Gemfile')
end

guard :shell do
  watch(/^(src\/|www\/|support\/)/) do |f|
    puts "Rebuilding on: #{f}"
    `rake make`
    # `rake lint`
  end
end
