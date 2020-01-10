import {
  TEST_NET,
  MAIN_NET,
  MAIN_NET_LIST,
  DEFAULT_SCRYPT,
  TEST_NET_LIST
} from './consts'
import axios from 'axios'
import store from '../renderer/store'
import {message} from 'ant-design-vue'
import i18n from '../common/lang'
import {
  BigNumber
} from 'bignumber.js'
import numeral from 'numeral'
import {Crypto, RestClient} from 'tesrasdk-ts'
const opn = require('opn')
const {
    BrowserWindow
  } = require('electron').remote;

const os = require('os')
const fs = require('fs')

export function open(url) {
  try {
    opn(url)
  } catch(err) {
    let win = new BrowserWindow({width: 800, height: 600, center: true});
    win.on('closed', () => {
      win = null
    })

    // Load a remote URL
    win.loadURL(url)
  }
}
export function varifyPositiveInt(value) {
    if (!/^[1-9]\d*$/.test(value)) {
        return false;
    }
    return true;
}

export function varifyTsgValue(value) {
    if (!/^[0-9]+([.]{1}[0-9]{1,9})?$/.test(value)) {
        return false;
    }
    return true;
}

export function isHexString(str) {
    const regexp = /^[0-9a-fA-F]+$/;
    return regexp.test(str) && (str.length % 2 === 0);
}

export function getNodeUrl() {
    // const net = localStorage.getItem('net');
    // return net === 'TEST_NET' ? TEST_NET + ':20334' : MAIN_NET + ':20334'
    // return 'http://139.219.128.220:20334' //for test 
    const net = localStorage.getItem('net')
    let node = localStorage.getItem('nodeAddress');
    if(!node) {
      node = net === 'TEST_NET' ? TEST_NET_LIST[0] : MAIN_NET_LIST[0]
    }
    // const node = localStorage.getItem('nodeAddress') || MAIN_NET_LIST[0]
    // return node + ':20334';
    String.prototype.rsplit = function(sep, maxsplit) {
      var split = this.split(sep);
      return maxsplit ? [ split.slice(0, -maxsplit).join(sep) ].concat(split.slice(-maxsplit)) : split;
    }    
    return node.rsplit(":", 1)[0] + ':25770';
}

export function getRestClient() {
  let url = getNodeUrl();
  const restClient = new RestClient(url);
  return restClient;
}

export function convertNumber2Str(num, decimal = 0, division) {
    const val = new BigNumber(num).dividedBy(Math.pow(10, decimal))
    if(division) {
      return val.toFixed(8);
    }
    return val.toString();
}

export function convertStr2Number(str, decimal = 0) {
    const val = new BigNumber(num).times(Math.pow(10, decimal))
    return val.toNumber();
}

export function decryptWallet(wallet, password, scrypt = DEFAULT_SCRYPT) {
    const enc = new Crypto.PrivateKey(wallet.key)
    let pri;
    try {
      pri = enc.decrypt(password, new Crypto.Address(wallet.address), wallet.salt, scrypt)
    } catch (err) {
      console.log(err);
      store.dispatch('hideLoadingModals')
      message.error(i18n.t('common.pwdErr'))
      return;
    }
    return pri;
}

export function validateAddress(address) {
  try {
    const addr = new Crypto.Address(address)
    addr.serialize();
    return true;
  }catch(err) {
    return false;
  }
}

export function convertScryptParams({n, r, p, dkLen}) {
  return {
    cost: n,
    blockSize: r,
    parallel: p,
    size: dkLen
  }
}

// 创建axios实例
const service = axios.create({
  timeout: 15000 // 请求超时时间
});

// request拦截器
service.interceptors.request.use(
  config => {
    if(config.method !== 'get') { // 定时查询的时候不希望页面显示loading
      store.dispatch('showLoadingModals')
    }
    return config;
  },
  error => {
    console.log('e')
    store.dispatch('hideLoadingModals')
    Promise.reject(error);
  }
);
// respone拦截器
service.interceptors.response.use(
  response => {
    store.dispatch('hideLoadingModals')
    const data = response.data;
    return data;
  },
  error => {
    store.dispatch('hideLoadingModals')
    const response = error.response;
    message.error(i18n.t('commonWalletHome.networkError'))
    return Promise.reject((response && response.data) || error);
  }
);

export default service;

export function getExplorerUrl() {
  const net = localStorage.getItem('net');
  const url = net === 'TEST_NET' ? 'http://explorer.tesra.me:3000' : 'http://explorer.tesra.me:3000';
  return url;
}

export function getTransactionListUrl(address, page_size = 10, page_number =1) {
  const api = `/v2/addresses/${address}/transactions?page_size=${page_size}&page_number=${page_number}`
  const url = getExplorerUrl() + api;
  return url;
}

export function getBalanceUrl(address, token_type = 'NATIVE') {
   const api = `/v2/addresses/${address}/${token_type}/balances`
   const url = getExplorerUrl() + api;
   return url;
}

export function getTokenListUrl(token_type = 'oep4', page_size = 10, page_number = 1) {
  const api = `/v2/tokens/${token_type}?page_size=${page_size}&page_number=${page_number}`
  const url = getExplorerUrl() + api;
  return url;
}

export function getTokenBalanceUrl(token_type, address) {
  const api = `/v2/addresses/${address}/${token_type}/balances`
  const url = getExplorerUrl() + api;
  return url;
}

export function validateKeystorePath(path) {
  const system = os.platform();
  if(system.indexOf('win') > -1 && system !== 'darwin') {
    const files = fs.readdirSync(path)
    if(files && files.indexOf('resources') > -1 && files.indexOf('TWallet.exe') > -1) {
      return false;
    }
    const cwd = process.cwd();
    if(path && cwd !== '/' && (path === cwd || path.indexOf(cwd) > -1)) {
      return false;
    }
  }
  return true;
}

export function formatScryptParams(scrypt) {
  return {
    cost: scrypt.n || 16384, // 除以2时间减半
    blockSize: scrypt.r || 8,
    parallel: scrypt.p || 8,
    size: scrypt.dkLen || 64
  }
}