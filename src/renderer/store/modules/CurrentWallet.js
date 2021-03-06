import axios from 'axios'
import {
  getBalanceUrl
 } from '../../../core/utils'

const state = {
    wallet : {
        // for json and hardware wallet
        publicKey: '',
        address: '',
        name: '',
        //for shared wallet
        coPayers: [],
        requiredNumber:'',
        totalNumber:''
    },
    balance: {
        tst: 0,
        tsg: 0,
        waitBoundTsg:0,
        unboundTsg: 0
    },
    transfer: {
        balance : {
            tst: 0,
            tsg: 0
        },
        oep4s:[],
        from:'',
        to: '',
        amount:0,
        asset:'TST',
        gas:0.01,
        coPayers : [],
        sponsorPayer:'',
        isRedeem: false
    },
    pendingTx: {
        
    },
    currentSigner: '',
    localCopayers : [],
    redeem: {
        claimableTsg: 0,
        balanceTsg: 0
    },
    nep5Tst: 0
}

const mutations = {
    UPDATE_CURRENT_WALLET(state, payload){
        state.wallet = Object.assign({}, state.wallet, payload.wallet);
    },
    UPDATE_TRANSFER(state, payload) {
        state.transfer = Object.assign({}, state.transfer, payload.transfer)
    }, 
    UPDATE_LOCAL_COPAYERS(state, payload) {
        state.localCopayers = payload.localCopayers
    },
    UPDATE_PENDINGTX(state, payload) {
        state.pendingTx = payload.pendingTx
    },
    UPDATE_CURRENT_SIGNER(state, payload) {
        state.currentSigner = payload.account
    },
    UPDATE_NATIVE_BALANCE(state, payload) {
        state.balance = payload.balance
    },
    CLEAR_NATIVE_BALANCE(state, payload) {
        state.balance = {}
    },
    CLEAR_CURRENT_TRANSFER(state, payload) {
        state.transfer = {
            balance: {
                tst: 0,
                tsg: 0
            },
            oep4s: [],
            from: '',
            to: '',
            amount: 0,
            asset: 'TST',
            gas: 0.01,
            coPayers: [],
            sponsorPayer: ''
        }
    },
    UPDATE_CURRENT_REDEEM(state, payload) {
        state.redeem = payload.redeem
    },
    UPDATE_NEP5_TST(state, payload) {
        state.nep5Tst = payload.nep5Tst
    },
    UPDATE_TRANSFER_REDEEM_TYPE(state, payload) {
        state.transfer.isRedeem = payload.type;
        state.transfer.asset = payload.type ? 'TSG' : 'TST'
    }

}

const actions = {
    clearTransferBalance({commit}) {
        commit('CLEAR_CURRENT_TRANSFER')
    },
    getNativeBalance({commit}, {address}) {
        const url = getBalanceUrl(address, 'NATIVE');
        const balance = {}
        return axios.get(url).then(res => {
          if (res.data.result) {
            for (let r of res.data.result) {
              if (r.asset_name === 'tsg') {
                balance.tsg = r.balance;
              }
              if (r.asset_name === 'waitboundtsg') {
                balance.waitBoundTsg = r.balance;
              }
              if (r.asset_name === 'unboundtsg') {
                balance.unboundTsg = r.balance;
              }
              if (r.asset_name === 'tst') {
                balance.tst = r.balance;
              }
            }
            commit('UPDATE_NATIVE_BALANCE', {
              balance
            })
            return balance; // get balance succeed
          }
        }).catch(err => {
          console.log(err)
          return null; // get balance failed
        })
    }
}

export default {
    state,
    mutations,
    actions
}
