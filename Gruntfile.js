module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        typescript: {
            base: {
                src: ['src/index.ts'],
                options: {
                    module: 'commonjs',
                    target: 'es5',
                    sourcemap: true,
                    declaration: false
                }
            }
        },
        watch: {
            files: ['<%= typescript.base.src %>'],
            tasks: ['typescript']
        }
    });

    grunt.loadNpmTasks('grunt-typescript');
    grunt.loadNpmTasks('grunt-contrib-watch');
    
    grunt.registerTask('default', ['typescript']);
};