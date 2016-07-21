var fsp = require('fs-promise')
var path = require('path')
var jschardet = require('jschardet')
var iconv = require('iconv-lite')

// 设置最终输出的文件的编码
var encodingForResult = 'utf8'

// 设置要处理的文件夹的路径
var inputDir = '../input/'

// 设置输出文件夹的路径
var outputDir = '../output'


var txtBeautifier = {
    init() {
        this.handle()
    },
    handle() {
        inputDir = inputDir || '../input/'
        outputDir = outputDir || '../output'
        let realPath
        let failedFiles = []

        if (path.isAbsolute(inputDir)) {
            realPath = path.join(inputDir, '/')
        } else {
            realPath = path.join(__dirname, inputDir, '/')
        }
        console.log('inputDir', realPath)

        fsp.readdir(realPath).then((files) => {
            console.log('all files:', files)

            for (let file of files) {
                new function(file, realPath) {
                    fsp.readFile(realPath + file).then((data) => {

                        let charset = jschardet.detect(data)
                            // 解码失败
                        if (!charset.encoding) {
                            failedFiles.push(file)
                            return
                        }

                        charset.encoding = charset.encoding.toLowerCase().replace(/\-/g, '')

                        let result = txtBeautifier.beautify(data, charset.encoding)

                        console.log('start write file:', file)
                        txtBeautifier.writeFile(file, result)

                    }).catch(function(e) {
                        console.log(e)
                    })
                }(file, realPath)
            }
        }).catch(function(e) {
            console.log(e)
        })
    },
    beautify(string, encoding) {
        let result

        string = iconv.decode(string, encoding)
        result = this.replace(string)

        return result
    },
    replace(string) {
        let result
        let replaceFn = function(match, offset, string) {
            let before = string[offset - 1]

            // 前面是“目录” 允许换行
            if (string[offset - 2] + before === '目录') {
                return '\n'
            }

            // 前面是“序” 允许换行
            if (before === '序') {
                return '\n'
            }

            // 前面是句号，允许换行
            // 其他，问号、感叹号、双引号、省略号
            if (before === '。' || before === '？' || before === '！' || before === '”' || before === '…') {
                return '\n'
            }

            // 前面是致谢，允许换行
            if (string[offset - 2] + before === '致谢') {
                return '\n'
            }

            // 前面是英文 .?! ，允许换行
            if (before === '.' || before === '?' || before === '!') {
                return '\n'
            }

            // 后续的10个字符中，可能出现了“第x章”、“第x节”，那么允许换行
            let after = string.substring(offset + 1, offset + 11)
            if (after.indexOf('第') > -1 && (after.indexOf('章') > -1 || after.indexOf('节') > -1)) {
                return '\n'
            }

            // 其他情况，把换行符替换为 一个空格
            // 本来想替换为空，但是想想还是替换为空格吧
            // 避免有时候文章出现一些诗歌，语句全部连在一起了
            return ' '
        }

        result = string.replace(/\r\n/g, replaceFn)

        result = result.replace(/\n/g, replaceFn)

        return result
    },
    writeFile(filename, content) {
        let realPath

        if (path.isAbsolute(outputDir)) {
            realPath = path.join(outputDir, '/')
        } else {
            realPath = path.join(__dirname, outputDir, '/')
        }
        console.log('outputDir:', realPath)

        let writeFile = function() {
            fsp.writeFile(realPath + filename, content, encodingForResult).then((data) => {
                console.log('Complete, ', filename)
            }).catch(function(e) {
                console.log(e)
            })
        }

        fsp.exists(realPath)
            .then((exists) => exists || fsp.mkdir(realPath))
            .then(writeFile)
            .catch(function(e) {
                console.log(e)
            })

    }
}

// run
txtBeautifier.init()
