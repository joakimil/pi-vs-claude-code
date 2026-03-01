export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy('config.js');
  eleventyConfig.addPassthroughCopy('css');
  eleventyConfig.addPassthroughCopy('js');
  eleventyConfig.addPassthroughCopy('manifest.json');
  eleventyConfig.addPassthroughCopy('sw.js');
  return {
    dir: {
      input: 'src',
      output: 'dist',
      includes: '_includes',
    },
  };
}
