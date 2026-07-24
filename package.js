const { packager } = require('@electron/packager');

packager({
  dir: '.',
  name: 'BalanceVision',
  platform: 'win32',
  arch: 'x64',
  out: 'release',
  overwrite: true,
  ignore: [
    /^\/node_modules/,
    /^\/client\/node_modules/,
    /^\/client\/src/,
    /^\/client\/public/,
    /^\/server\/data/,
    /^\/release/,
    /^\/\.git/,
  ]
}).then(paths => {
  console.log('Packaged to:', paths);
}).catch(err => {
  console.error('Packaging error:', err);
  process.exit(1);
});
