import { TWallet, Identity, Crypto, TstidContract, TransactionBuilder } from "tesrasdk-ts";
import {GAS_PRICE, GAS_LIMIT} from '../../../core/consts'
const state = {
  currentStep: 0,
  label: '',
  tstid: '',
  identity: '',
  tx: ''
}

const mutations = {
  ADD_CREATE_IDENTITY_STEP(state, payload) {
    state.currentStep += 1;
  },
  SUB_CREATE_IDENTITY_STEP(state, payload) {
    if(state.currentStep > 0) {
      state.currentStep -= 1;
    }
  },
  CREATE_IDENTITY(state, payload) {
    state.label = payload.label
    state.tstid = payload.tstid
    state.identity = payload.identity,
    state.tx = payload.tx
  },
  INIT_CREATE_IDENTITY(state, payload) {
    state.currentStep = 0
    state.label = ''
    state.tstid = ''
    state.identity = '',
    state.tx = ''
  }
}

const actions = {
  createIdentityWithPrivateKey({commit}, body) {
    // wallet.scrypt.n = 16384;

    // let params = {
    //   cost: 16384,
    //   blockSize: 8,
    //   parallel: 8,
    //   size: 64
    // };

    let identity = Identity.create(body.privateKey, body.password, body.label)
    const publicKey = body.privateKey.getPublicKey();
    const tx = TstidContract.buildRegisterTstidTx(identity.tstId, publicKey, GAS_PRICE, GAS_LIMIT);
    tx.payer = body.payer;
    TransactionBuilder.signTransaction(tx, body.privateKey);
    identity = identity.toJsonObj();
    commit('CREATE_IDENTITY', {
      label: body.label,
      tstid: identity.tstId,
      identity,
      tx: tx
    })

    return tx
  }
}

export default {
  state,
  mutations,
  actions
}
