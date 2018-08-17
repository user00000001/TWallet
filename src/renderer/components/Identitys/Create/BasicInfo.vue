<template>
  <div>
    <div class="basic-label">
      <a-input class="input" :placeholder="$t('createIdentity.label')" v-model="label"
          v-validate="{required: true}" name="label"
      ></a-input>
      <span class="v-validate-span-errors" v-show="errors.has('label')">{{ errors.first('label') }}</span>
      
      <a-input type="password" class="input input-password"
               v-validate="{required: true ,min:6}" name="password"
               v-model="password" :placeholder="$t('createIdentity.password')"></a-input>
      <span class="v-validate-span-errors" v-show="errors.has('password')">{{ errors.first('password') }}</span>

      <a-input type="password" class="input input-repassword"
               v-validate="{required: true , min:6, is:password}" data-vv-as="password confirmation" name="rePassword"
               v-model="rePassword" :placeholder="$t('createIdentity.rePassword')"></a-input>
      <span class="v-validate-span-errors" v-show="errors.has('rePassword')">{{ errors.first('rePassword') }}</span>

      <div class="create-select-wallet">
        <p class="font-medium-black">{{$t('createIdentity.selectWallet')}}</p>
        <a-radio-group @change="changePayerWallet" v-model="payerWalletType" class="change-payer-radio">
          <a-radio value="commonWallet">{{$t('createIdentity.commonWallet')}}</a-radio>
          <a-radio value="ledgerWallet">{{$t('createIdentity.ledgerWallet')}}</a-radio>
          <div v-if="payerWalletType === 'commonWallet'">
           <a-select :options="localCommonWallet" class="select-payer-wallet" 
           :placeholder="$t('createIdentity.selectCommonWallet')"
            @change="handleChangePayer">
           </a-select>
           <a-input type="password" class="input" v-model="payerPassword" :placeholder="$t('createIdentity.payerPassword')"></a-input>
          </div>

          <div v-if="payerWalletType === 'ledgerWallet'">

            <div class="payer-ledger-status">
              <div class="font-bold" style="margin-bottom: 15px;">{{$t('ledgerWallet.connectApp')}}</div>
              <span class="font-medium-black">{{$t('ledgerWallet.status')}}: </span>
              <span class="font-medium">{{ledgerStatus}} </span>
            </div>
            
          </div>

        </a-radio-group>
        
        
      </div>
    </div>

    <div class="basic-pk-btns">
      <div class="btn-container">
        <a-button type="default" @click="cancel" class="btn-cancel">{{$t('createIdentity.cancel')}}</a-button>
        <a-button type="primary" @click="next" class="btn-next">{{$t('createIdentity.next')}}</a-button>
      </div>
    </div>
  </div>
</template>

<script>
  import {mapState} from 'vuex'
  import {Wallet, Account, Crypto, TransactionBuilder} from "ontology-ts-sdk"
  import FileHelper from "../../../../core/fileHelper"
  import dbService from '../../../../core/dbService'
  import {DEFAULT_SCRYPT, TEST_NET, MAIN_NET} from '../../../../core/consts'
import {legacySignWithLedger} from '../../../../core/ontLedger'

  export default {
    name: 'BasicInfo',
    data() {
      const net = localStorage.getItem('net');
      let url = ''
      if (net === 'TEST_NET') {
          url = TEST_NET + ':20334'
      } else {
          url = MAIN_NET + ':20334'
      }
      return {
        label: "",
        password: "",
        rePassword: "",
        createSuccess: false,
        payerWalletType: 'commonWallet',
        payerWallet: '',
        localCommonWallet:[],
        payerPassword: '',
        nodeUrl: url
      }
    },
    mounted(){
      this.updateLocalCommonWallets()
      this.$store.dispatch('getLedgerStatus')
    },
    beforeDestroy(){
      this.$store.dispatch('stopGetLedgerStatus')
    },
    computed: {
      ...mapState({
        ledgerStatus: state => state.LedgerConnector.ledgerStatus,
        ledgerPk : state => state.LedgerConnector.publicKey,
        ledgerWallet: state => state.LedgerConnector.ledgerWallet
      })
    },
    methods: {
      updateLocalCommonWallets() {
            var that = this;
                const localpayers = []
                dbService.find({type:'CommonWallet'}, function (err, accounts) {
                    if (err) {
                        console.log(err)
                        return;
                    }

                    for (let ac of accounts) {
                      localpayers.push(Object.assign({}, ac.wallet, 
                      {value:ac.address, label:ac.wallet.label + ' ' + ac.address}))
                    }
                    that.localCommonWallet = localpayers
                })
        },
      next() {
        if(this.payerWallet === 'commonWallet' && !this.payerWallet) {
          this.$message.error(this.$t('createIdentity.selectOneWallet'))
          return;
        }
        if(this.payerWallet === 'commonWallet' && this.payerWallet && !this.payerPassword) {
          this.$message.error(this.$t('createIdentity.enterPassword'))
        }
        this.$validator.validateAll().then(result => {
          if(result) {
            let privateKey = Crypto.PrivateKey.random()
            let body = {
              label: this.label,
              privateKey: privateKey,
              password: this.password
            }
            this.$store.dispatch('createIdentityWithPrivateKey', body).then(res => {
              // console.log(res)
              const tx = res
              this.$store.dispatch('showLoadingModals')
              if(this.payerWalletType === 'commonWallet') {
                tx.payer = new Crypto.Address(this.payerWallet.address)
                const enc = new Crypto.PrivateKey(this.payerWallet.key)
                let pri;
                try {
                  pri = enc.decrypt(this.payerPassword, new Crypto.Address(this.payerWallet.address), this.payerWallet.salt, DEFAULT_SCRYPT)
                } catch (err) {
                  console.log(err);
                  this.$message.error(this.$t('common.pwdErr'))
                  return;
                }
                TransactionBuilder.signTransaction(tx, pri);
                this.sendTx(tx)
              } else {
                if(this.ledgerPk) {
                  this.$store.dispatch('showLoadingModals')
                  tx.payer = new Crypto.Address(this.ledgerWallet.address)
                  const pk = new Crypto.PublicKey(this.ledgerWallet.publicKey);
                  const txSig = new Ont.TxSignature();
                  txSig.M = 1;
                  txSig.pubKeys = [pk];
                  const txData = tx.serializeUnsignedData();
                  legacySignWithLedger(txData, this.publicKey).then(res => {
                  // console.log('txSigned: ' + res);
                  const sign = '01' + res; //ECDSAwithSHA256
                  txSig.sigData = [sign]
                  tx.sigs = [txSig];
                  this.sendTx(tx);
                  }, err => {
                      this.ledgerStatus = '';
                      alert(err.message)
                  }) 
              } else {
                  this.$message.warning(this.$t('ledgerWallet.connectApp'))
              }
              }
            })

            
          }
        })
      },
      sendTx(tx){
        const restClient = new Ont.RestClient(this.nodeUrl);
          restClient.sendRawTransaction(tx.serialize()).then(res => {
          console.log(res)
          if (res.Error === 0) {
            this.$message.success(this.$t('common.transSentSuccess'))
          } else if (res.Error === -1) {
            this.$message.error(this.$t('common.ongNoEnough'))
          } else {
            this.$message.error(res.Result)
          }
          this.$store.commit('ADD_CREATE_JSON_STEP')
          // const title = this.$t('common.transSentSuccess')
          // setTimeout(() => {
          //     this.$success({
          //         title: title,
          //         content: 'Transaction hash: ' + utils.reverseHex(tx.getHash())
          //     })
          // }, 100)
        })
      },
      cancel() {
        this.$router.push({name: 'Identitys'})
      },
      changePayerWallet(e) {
        this.payerWalletType = e.target.value
      },
      handleChangePayer(value) {
        this.payerWallet = this.localCommonWallet.find((v)=>{return v.address === value})
      }
    }
  }
</script>

<style>
  .basic-label {
    width: 540px;
    margin: 2px auto;
  }

  .input-password {
    margin-top: 30px;
  }

  .input-repassword {
    margin-top: 10px;
  }

  .copayer-label {
    margin-left: 172px;
    margin-top: 40px;
  }

  .basic-pks {
    width: 540px;
    margin: 0px auto;
  }

  .pk-item {
    margin-bottom: 15px;
  }

  .pk-item :first-child {
    width: 150px;
    margin-right: 20px;
    display: inline-block;
  }

  .pk-item :nth-child(2) {
    width: 318px;
  }

  .delete-icon {
    height: 34px;
    width: 34px;
    /* display: inline-block; */
    background: url('../../../assets/delete.png') center center;
    background-size: contain;
    float: right;
    margin-right: 10px;
    cursor: pointer;
  }

  .basic-pk-box {
    border: 1px solid #dddddd;
    width: 100%;
    height: 300px;
    padding: 10px;
    position: relative;
  }

  .basic-pk-add {
    border-top: 1px solid #dddddd;
    width: calc(100% - 20px);
    position: absolute;
    bottom: 10px;
    left: 10px;
    padding-top: 10px;
  }

  .basic-pk-item {
    width: 100%;
    float: left;
  }

  .basic-pk-item span {
    margin-right: 10px;
  }

  .basic-add-item {
    display: inline-block;
    width: 40%;
  }

  .basic-add-item input {
    width: 80%;
  }

  .basic-pk-btns {
    position: fixed;
    bottom: 0;
    width: calc(100% - 4rem);
    height: 85px;
    left: 4rem;
    background: #FFFFFF;
    box-shadow: 0 -1px 6px 0 #F2F2F2;
    z-index: 1000;
  }

  .basic-pk-btns button:first-child {
    float: left;
  }

  .basic-pk-btns :nth-child(2) {
    float: right;
  }

  .basic-pk-btns :nth-child(3) {
    float: right;
    margin-right: 20px;
  }

  .error-input {
    border-color: red;
  }
  .create-select-wallet {
    margin-top: 15px;
  }
  .select-payer-wallet {
    width:100%;
    margin-bottom:10px;
    margin-top:15px;
  }
  .change-payer-radio {
    width:100%;
  }
  .payer-ledger-status {
    margin-top:10px;
    padding: 5px 10px;
  }
</style>
