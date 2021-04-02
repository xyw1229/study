/*
 * @Description:
 * @Version: 1.0
 * @Autor: ziwei
 * @Date: 2021-04-02 10:54:58
 * @LastEditors: ziwei
 * @LastEditTime: 2021-04-02 11:20:01
 */

let PENDING = 'PENDING';
let FULLFILLed = 'FULLFIlled';
let REJECTED = 'REJECTED';

class Promise {
  constructor(executor) {
    this.status = PENDING; //promise默认的状态
    this.value = undefined; //成功的原因
    this.reason = undefined; //失败的原因
    this.onResolvedCallbacks = [];
    this.onRejectedCallback = [];
    const resolve = (value) => {
      //成功的resolve函数
      if (this.status === PENDING) {
        this.value = value;
        this.status = FULLFILLed;
        this.onResolvedCallbacks.forEach((v) => {
          v();
        });
      }
    };

    const reject = (reason) => {
      //失败的函数
      if (this.status === PENDING) {
        this.status = REJECTED; //修改状态
        this.reason = reason;
        this.onRejectedCallback.forEach((v) => {
          v();
        });
      }
    };

    try {
      executor(resolve, reject);
    } catch (e) {
      //一旦抛出异常也执行失败
      reject(e);
    }
  }
  then(onFullfilled, onRejected) {
    //onFulfilled onRejected promise+规定的2个函数
    let promise2 = new Promise((resolve, reject) => {
      if (this.status == FULLFILLed) {
        //成功调用成功的方法
        try {
          let x = onFullfilled(this.value);

          //此x 可能是一个promise 如果是promise需要看一下这个promise是成功还是失败 .then,如果是成功则把成功结果调用promise2的resolve传递进去，如果失败则同理

          //总结 x的值决定是调用promise2的resolve还是reject，如果是promise则取他的状态，如果是普通值则直接调用resolve
          resolve(x);
        } catch (e) {
          reject(e);
        }
      }
      if (this.status == REJECTED) {
        //失败调用失败的方法
        try {
          let x = onRejected(this.reason);
          resolve(x);
        } catch (e) {
          reject(e);
        }
      }
      if (this.status == PENDING) {
        //代码是异步调用resolve或者reject
        try {
          this.onResolvedCallbacks.push(() => {
            let x = onFullfilled(this.value);
            resolve(x);
          });
        } catch (e) {
          reject(e);
        }
        try {
          this.onRejectedCallback.push(() => {
            let x = onRejected(this.reason);
            resolve(x); //只要返回的普通值都会走resolve
          });
        } catch (e) {
          reject(e);
        }
      }
    });
    return promise2;
  }
}

module.exports = Promise;