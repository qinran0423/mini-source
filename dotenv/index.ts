import fs from "fs"
import path from "path"
import os from "os"

function parse(src) {
  const obj = {}

  src
    .toString()
    .split("\n")
    .forEach((line) => {
      const keyValueStr = line.split("=")
      const key = keyValueStr[0]
      const val = keyValueStr[1] || ""
      obj[key] = val
    })
  return obj
}

function _resolveHome(envPath) {
  return envPath[0] === "~"
    ? path.join(os.homedir(), envPath.slice(1))
    : envPath
}

// 可由用户自定义路径
// 可由用户自定义解析编码规则
// 完善报错输出，用户写的 env 文件自由度比较大，所以需要容错机制。
function config(options?) {
  // 读取node执行的当前路径下的.env文件
  let dotenvPath = path.resolve(process.cwd(), ".env")
  let encoding: BufferEncoding = "utf8"
  let debug = false
  if (options) {
    if (options.path !== null) {
      dotenvPath = _resolveHome(options.path)
    }

    if (options.encoding !== null) {
      encoding = options.encoding
    }

    if (options.debug !== null) {
      debug = true
    }
  }
  try {
    const parsed = parse(fs.readFileSync(dotenvPath, { encoding }))

    Object.keys(parsed).forEach((key) => {
      if (!Object.prototype.hasOwnProperty.call(process.env, key)) {
        process.env[key] = parsed[key]
      } else if (debug) {
        console.log(
          `"${key}" is already defined in \`process.env\` and will not be overwritten`
        )
      }
    })

    return parsed
  } catch (error) {
    return { error }
  }
}

export default {
  parse,
  config
}
