const { src, dest, parallel, series, watch } = require('gulp')

const del = require('del')
const browserSync = require('browser-sync')

const loadPlugins = require('gulp-load-plugins')

const plugins = loadPlugins()
const { sass, babel, swig, imagemin } = loadPlugins()

// 创建一个开发服务器
const bs = browserSync.create()

const data = {
    menus: [
        {
            name: 'Home',
            icon: 'aperture',
            link: 'index.html'
        },
        {
            name: 'Features',
            link: 'features.html'
        },
        {
            name: 'About',
            link: 'about.html'
        },
        {
            name: 'Contact',
            link: '#',
            children: [
                {
                    name: 'Twitter',
                    link: 'https://twitter.com/w_zce'
                },
                {
                    name: 'About',
                    link: 'https://weibo.com/zceme'
                },
                {
                    name: 'divider'
                },
                {
                    name: 'About',
                    link: 'https://github.com/zce'
                }
            ]
        }
    ],
    pkg: require('./package.json'),
    date: new Date()
}

// 清除dist
const clean = () => {
    return del(['dist'])
}

const style = () => {
    // 读取'src/assets/styles/’路径下的所用scss文件
    //  { base: 'src' } 确定基准路径为src，这样基准路径后面的结构就会被保留下来（保留原始目录结构）
    return src('src/assets/styles/*.scss', { base: 'src' })
        // 用sass插件完成样式转换
        // { outputStyle: 'expanded' } 设置转换后的文件内容风格为完全展开
        .pipe(sass({ outputStyle: 'expanded' }))
        .pipe(dest('temp'))
        .pipe(bs.reload({ stream: true })) // 文件处理完后执行更新服务器,以流的方式向浏览器推
}

const scripts = () => {
    return src('src/assets/scripts/*.js', { base: 'src' })
        // 如果不传 { presets: ['@babel/preset-env'] }会转换没有效果
        // babel默认只是一个ECMAScript的一个转换平台，只是提供一个环节，具体去转换的是babel提供的一些插件
        // preset就是插件的集合
        // preset-env就是最新的所有特性的整体打包
        // 这里也按照需要安装对应的转换插件
        // babal的配置也可以单独的写到babelrc的文件里
        .pipe(babel({ presets: ['@babel/preset-env'] }))
        .pipe(dest('temp'))
        .pipe(bs.reload({ stream: true })) // 文件处理完后执行更新服务器,以流的方式向浏览器推
}

const page = () => {
    // 'src/**/*.html'用通配符匹配src下的所有html文件
    return src('src/**/*.html', { base: 'src' })
        .pipe(swig({ data, defaults: { cache: false } })) // data 传参，cache: false 防止模板缓存导致页面不能及时更新
        // .pipe(swig({ data }))// data 传参
        .pipe(dest('temp'))
        .pipe(bs.reload({ stream: true })) // 文件处理完后执行更新服务器,以流的方式向浏览器推
}

const image = () => {
    return src('src/assets/images/**', { base: 'src' })
        .pipe(imagemin())
        .pipe(dest('dist'))
}

const font = () => {
    return src('src/assets/fonts/**', { base: 'src' })
        .pipe(imagemin())
        .pipe(dest('dist'))
}

// 其他文件
const extra = () => {
    return src('public/**', { base: 'public' })
        .pipe(dest('dist'))
}

const serve = () => {
    // 用watch监视所有产生任务的路径
    watch('src/assets/styles/*.scss', style)// 监视路径，执行任务
    watch('src/assets/scripts/*.js', scripts)
    watch('src/**/*.html', page)

    // 在开发阶段 为减少性能的消耗 image等资源文件不执行编译或拷贝
    // watch('src/assets/images/**', image);
    // watch('src/assets/fonts/**', font);
    // watch('public/**', extra);

    // 监听文件变化执行更新服务器
    watch([
        'src/assets/images/**',
        'src/assets/fonts/**',
        'public/**'
    ], bs.reload)

    // 初始化服务器的相关配置
    bs.init({
        notify: false, // 运行或刷新状态的小提示
        port: 2080, // 端口设置 端口默认为3000
        // open:false, // 启动的时候是否自动打开浏览器 默认为true
        // files: 'temp/**',// 指定browser-sync启动后的路径通配符，指定文件改变后自动刷新浏览器 (dist/**表示dist的所有文件) （文件的监听也可以在对应文件任务执行完后执行bs.reload来更新浏览器）
        // 核心配置server
        server: {
            // baseDir: 'temp',// 网站的根目录
            baseDir: ['temp', 'src', 'public'], // 网站的根目录,按顺序依次查找temp、src、public
            // routes会优先于baseDir
            routes: {
                '/node_modules': 'node_modules'
            }
        }
    })
}

const useref = () => {
    return src('temp/*.html', { base: 'temp' }) // 可以不指定{ base: 'temp' }
        .pipe(plugins.useref({ searchPath: ['temp', '.'] })) // 一般这种数组参数 我们会把使用更多的放在前面
        // 分别压缩HTML、CSS、JavaScript
        .pipe(plugins.if(/\.js$/, plugins.uglify()))// 匹配所有以.js结尾的文件进行压缩
        .pipe(plugins.if(/\.css$/, plugins.cleanCss()))
        .pipe(plugins.if(/\.html$/, plugins.htmlmin({ // htmlmin 默认压缩属性间的空格符
            collapseWhitespace: true, // 压缩空白符和换行符
            minifyCSS: true, // 压缩style标签内的内容
            minifyJS: true // 压缩Script标签内的内容
        })))
        .pipe(dest('dist'))
}

const compile = parallel(style, scripts, page)

// 先删除dist，再重新生成
// 上线之前执行的任务
const build = series(clean, parallel(series(compile, useref), image, font, extra))

const develop = series(compile, serve)

module.exports = {
    clean,
    build,
    develop
}
