const gulp       = require('gulp');
const babel      = require('gulp-babel');
const sourceMaps = require('gulp-sourcemaps');
const browserify = require('gulp-browserify');
const rename     = require('gulp-rename');
const uglify     = require('gulp-uglify');
const watch      = require('gulp-watch');

gulp.task('default', ['compile']);

gulp.task('compile', function () {
    return gulp.src('src/**/*.js')
        .pipe(sourceMaps.init()) // Initialize source maps
        .pipe(babel({presets: ['es2015']})) // Transpile from ES6 to ES5
        .pipe(sourceMaps.write('.')) // Save source maps
        .pipe(gulp.dest('static/js/.out')) // Save to static/js/.out
        ;
});

gulp.task('bundle', function () {
    return gulp.src('static/js/.out/main.js')
        .pipe(sourceMaps.init()) // Initialize source maps
        .pipe(browserify()) // Bundle
        .pipe(rename('bundle.js')) // Rename the file to bundle.js
        .pipe(sourceMaps.write('.')) // Write the source maps
        .pipe(gulp.dest('static/js')) // Save the bundle to static/js
        ;
});

gulp.task('bundle:min', function () {
    return gulp.src('static/js/.out/main.js')
        .pipe(sourceMaps.init()) // Initialize source maps
        .pipe(uglify()) // Minify the source
        .pipe(browserify()) // Bundle
        .pipe(rename('bundle.min.js')) // Rename the file to bundle.min.js
        .pipe(sourceMaps.write('.')) // Write the source maps
        .pipe(gulp.dest('static/js')) // Save the bundle to static/js
        ;
});