import { existsSync, mkdirSync } from 'fs';
import chalk from 'chalk';
import del from 'del';
import gulp from 'gulp';
import gulpLoadPlugins from 'gulp-load-plugins';
import runSequence from 'run-sequence';
import flog from 'fancy-log';
import { find } from 'lodash';
import { spawn } from 'child_process';

import rollupConfig from './config/rollup.config';

const _v = require('./package.json').version;
const rollup = require('rollup');

const production = process.env.NODE_ENV === 'production';
const plugins = gulpLoadPlugins();

const paths = {
  js: ['src/js/**/*.js', 'node_modules/materialize-css/js/*.js'],
  scss: ['src/scss/*.scss'],
  templating: 'src/*.html',
  copyOnly: [
    'src/*.php', 'src/img/**', 'src/vendor/**/*.+(css|js)'
  ]
};

let httpServerProcess = null; // php-cli dev server process

const log = function log(...str) {
  const tag = this || find(gulp.tasks, { running: true }).name;
  flog(`[${chalk.cyan(tag)}] ${str.join(' ')}`);
  return true;
};

// Clean up dist directory
gulp.task('clean', () =>
  del.sync(['dist/**', 'dist/.*'])
);

// Copy non-js files to dist
gulp.task('copy', () => {
  gulp.src(paths.copyOnly, { base: './src' })
    .pipe(gulp.dest('./dist/'));
});

// parse html files for insertions
gulp.task('templates', () =>
  gulp.src(paths.templating)
    // .pipe(plugins.newer('dist'))
    .pipe(gulp.dest((file) => {
      if (file.history[0].endsWith('src/index.html')) {
        const contents = file._contents.toString();
        file._contents = new Buffer(// eslint-disable-line no-param-reassign
          contents
            .replace(/\{\{useMinified\}\}/g, production ? '.min' : '')
            .replace(/\{\{devBanner\}\}/g, production ? '' : `<div class="dev-banner">${_v}</div>`)
            .replace(/\{\{bundleVersion\}\}/g, process.env.bundleVersion)
        );
      }
      return `dist/${file.base.replace(`${file.cwd}/src`, '')}`;
    }))
);

// Start server with restart on file changes
gulp.task('dev', ['rollup', 'styles', 'templates', 'copy', 'serve'], () =>
  plugins.watch('src/**/*.*', () => {
    log('Killing php-cli server...');
    httpServerProcess.kill();
    log('Done');
    runSequence('rollup', 'styles', 'templates', 'copy', 'serve');
  })
);

gulp.task('rollup', async () => {
  log.call('rollup', 'Bundling scripts...');
  const bundle = await rollup.rollup(rollupConfig);
  log.call('rollup', 'Writing bundle...');
  await bundle.write(rollupConfig.output);
  log.call('rollup', 'Done!');
});

gulp.task('styles', async () => {
  log.call('styles', 'Compiling styles...');
  return gulp.src('./src/scss/**/*.scss')
    .pipe(plugins.sass().on('error', plugins.sass.logError))
    .pipe(gulp.dest(`./dist/css/${process.env.bundleVersion}`));
});

gulp.task('serve', (done) => {
  const args = ['-S', '0.0.0.0:8080', '-t', './dist/'];
  httpServerProcess = spawn('php', args);
  httpServerProcess.stdout.on('data', data =>
    data.toString().trim().split('\n')
      .forEach(line => log.call('serve', line.includes('http') ? chalk.green(line) : line))
  );
  httpServerProcess.stderr.on('data', data => log(data.toString().trim()));
  done();
});


gulp.task('build', ['clean', 'rollup', 'styles', 'templates', 'copy']);

// default task: clean dist, compile js files and copy non-js files.
gulp.task('default', ['dev']);

// templates task fails without ./dist directory
if (!existsSync('./dist')) {
  mkdirSync('./dist');
}

process.on('SIGINT', () => {
  if (httpServerProcess) {
    log('Killing php-cli server...');
    httpServerProcess.kill();
    log('Done');
  }
  process.exit();
});
