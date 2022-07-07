const { src, dest, parallel, series, watch } = require('gulp')

const autoprefixer = require('autoprefixer')
const browserSync = require('browser-sync').create()
const cssnano = require('cssnano')
const clean = require("gulp-clean")
const imagemin = require('gulp-imagemin')
const plumber = require('gulp-plumber')
const postcss = require('gulp-postcss')
const rename = require('gulp-rename')
const sass = require('gulp-sass')(require('sass'))
const gulpTerser = require('gulp-terser')
const gulpEsbuild = require('gulp-esbuild')

function pathsConfig() {
  const staticSrc = `./staticSrc`
  const vendorsRoot = './node_modules'
  const staticDest = './public/static'
  return {
    bootstrapSass: `${vendorsRoot}/bootstrap/scss`,
    vendorsJs: [
      `${vendorsRoot}/@popperjs/core/dist/umd/popper.js`,
      `${vendorsRoot}/bootstrap/dist/js/bootstrap.js`,
    ],
    php: './public',
    sass: `${staticSrc}/scss`,
    js: `${staticSrc}/js`,
    boostrapJs: `${staticSrc}/js/bootstrap.js`,
    images: `${staticSrc}/images`,
    cssDest: staticDest + '/css',
    jsDest: staticDest + '/js',
    imageDest: staticDest + '/images'
  }
}

var paths = pathsConfig()

var processCss = [
  autoprefixer(),
]

var minifyCss = [
  cssnano({ preset: 'default' })
]

function processScss() {
  return src(`${paths.sass}/main.scss`)
    .pipe(sass({
      includePaths: [
        paths.sass
      ]
    }).on('error', sass.logError))
    .pipe(plumber())
    .pipe(postcss(processCss))
    .pipe(rename({ suffix: '.min' }))
    .pipe(postcss(minifyCss))
    .pipe(dest(paths.cssDest))
}

function processJs() {
  return src(`${paths.js}/*.js`)
    .pipe(plumber())
    .pipe(gulpTerser())
    .pipe(rename({ suffix: '.min' }))
    .pipe(dest(paths.jsDest))
}

function processVendorJs() {
  return src(paths.vendorsJs)
    .pipe(plumber())
    .pipe(gulpTerser())
    .pipe(rename({ suffix: '.min' }))
    .pipe(dest(paths.jsDest))
}

function processBootstrapJs() {
  return src(paths.boostrapJs)
    .pipe(gulpEsbuild({
      outfile: 'bootstrap.min.js',
      bundle: true,
      minify: true,
      platform: 'browser',
      format: 'iife'
    }))
    .pipe(dest(paths.jsDest))
}

function compressImages() {
  return src(`${paths.images}/**/*.*(jpeg|jpg|png|ico|gif|svg)`)
    .pipe(imagemin([
      imagemin.gifsicle({ interlaced: true }),
      imagemin.mozjpeg({ quality: 70, progressive: true }),
      imagemin.optipng({ optimizationLevel: 7 }),
      imagemin.svgo({
        plugins: [
          { removeViewBox: true },
          { cleanupIDs: false }
        ]
      })
    ]))
    .pipe(dest(paths.imageDest))
}

function cleanDest() {
  return src([`${paths.cssDest}/**/*.css`, `${paths.jsDest}/**/*.js`, `${paths.imageDest}/**/*`])
    .pipe(clean())
}

function initBrowserSync() {
  let https;

  https = (process.env.BROWSERSYNC_HTTPS || "false") !== "false";

  const proxy = `${https ? 'https' : 'http'}://cuiqphp.com`
  browserSync.init({
    ui: {
      port: 3001
    },
    port: 3000,
    proxy,
    open: false,
    https,
    files: [
      `${paths.cssDest}/**/*.css`,
      `${paths.jsDest}/**/*.js`,
      `${paths.php}/**/*.php`,
    ]
  })
}

function watchPaths() {
  watch([`${paths.js}/**/*.js`], processJs)
  watch([`${paths.sass}/**/*.scss`], processScss)
}

const generateAssets = parallel(
  processScss,
  processJs,
  processBootstrapJs,
  processVendorJs,
  compressImages
)

const dev = parallel(
  initBrowserSync,
  watchPaths
)

exports.default = series(generateAssets, dev)
exports.generateAssets = generateAssets
exports.cleanDest = cleanDest
