/**
 * refer to: https://github.com/request/request-promise
 * API: request-promise == request
 * However, STREAMING THE RESPONSE (e.g. .pipe(...)) is DISCOURAGED. Use the original Request library for that.
 */
const requestPromise = require('request-promise');
const xml2js = require('xml2js');

/**
 * 
 * 
 * 通用请求（可自定义headers，body，qs，form等等）
 * @Author: luocj
 * @Date: 2019-12-22 20:20:20
 * @Desc: 公共请求，提供：get，post，或者request方法
 * - params：GET - qs; POST - body/form;
 * - form 不需要设置headers: { 'content-type': 'application/x-www-form-urlencoded' }
 * - 可直接指定其他配置项，如auth: {}等等
 */
// This may be converted to an async function.ts(80006)
async function request(options) {
  // 处理默认参数
  if (options.json === undefined) {
    options.json = true;
  }
  // 超时时间15秒
  options.timeout = 15000;
  // options.resolveWithFullResponse = true;
  // 发起请求
  return requestPromise(options).then(res => {
    if (!res || res.code !== 0) {
      console.log(
        `Request Callback: ${new Date().toLocaleString()}\n` +
        `Options: ${JSON.stringify(options)}\n` +
        `Response：${JSON.stringify(res)}\n`
      );
    }
    return res;
  }).catch(err => {
    console.error(
      `Request Error: ${new Date().toLocaleString()}\n` +
      `Options: ${JSON.stringify(options)}\n` +
      // Equal to err.message
      `Error: ${err.statusCode} - ${err.error}\n`
    );
    return err;
  });
}

/**
 * 普通get请求
 * @param {string} url 完整请求地址
 * @param {object} params 参数对象
 * @return {object} 响应
 */
async function get(url, params) {
  return await request({
    uri: url,
    qs: params,
  });
}

/**
 * 普通post请求
 * @param {string} url 完整请求地址
 * @param {object} params 参数对象
 * @return {object} 响应
 */
async function post(url, params?, headers?) {
  return await request({
    uri: url,
    method: 'POST',
    body: params,
    headers: headers
  });
}

/**
 * 普通xml报文请求
 * @see https://stackoverflow.com/questions/51089563/how-to-make-a-post-with-xml-body-content-type-header-using-request-promise-nativ
 * @see https://github.com/request/request/blob/643c43ab7be269a1efaa080ff05a18fff3f64cd7/README.md#using-optionsagentoptions
 * @param {string} url 完整请求地址
 * @param {object} params 参数对象
 * @param {object} agentOptions 证书配置
 * @return {object} 响应
 */
async function postXml(url, params, agentOptions) {
  const xmlStr = new xml2js.Builder({ xmldec: null, rootName: 'xml', cdata: true }).buildObject(params);
  const options = {
    method: 'POST',
    uri: url,
    headers: {
      'User-Agent': 'Request-Promise',
      'Content-Type': 'text/xml',
      'Content-Length': Buffer.byteLength(xmlStr),
    },
    body: xmlStr,
    json: false,
  };
  if (!!agentOptions) {
    //@ts-ignore
    options.agentOptions = agentOptions;
  }
  return await request(options);
}

/**
 * 处理响应错误信息（用于同一平台请求）
 * res.msg: code = -1
 * res.error: 504
 * res.error.msg 500
 * res.error.message: Error: connect ECONNREFUSED
 * res.error.error_description
 * @param {object} res 响应
 * @return {string} msg
 */
function getErrorMessage(res) {
  let errMsg = 'RES EMPTY.';
  if (!res) {
    return errMsg;
  }

  if (!!res.msg) {
    errMsg = res.msg;
  } else if (!!res.error && (typeof res.error) === 'string') {
    errMsg = res.error;
  } else if (!!res.error) {
    if (!!res.error.msg) {
      errMsg = res.error.msg;
    } else if (!!res.error.message) {
      errMsg = res.error.message;
    } else if (!!res.error.error_description) {
      errMsg = res.error.error_description;
    }
  }
  return errMsg;
}

export {
  request,
  get,
  post,
  postXml,
  getErrorMessage,
};
