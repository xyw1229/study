/*
 * @Description:promise中x (可以多次then  且then的结果可能是promise)
 * @Autor: ziwei
 * @Date: 2021-04-02 10:54:58
 * @LastEditors: ziwei
 * @LastEditTime: 2021-04-02 18:17:42
 */
//处理x 是不是promise
//别人的promise可能是成功后还能调用失败
//then 返回还是promise 递归处理
//值的穿透

let PENDING = 'PENDING';
let FULFILLED = 'FULFILLED';
let REJECTED = 'REJECTED';

//利用x的值判断时调用promise2的resolve还是reject
function resolvePromise(promise2, x, resolve, reject) {
  //核心流程
  if (promise2 === x) {//对应9.process 不能是自己
    return reject(new TypeError('错误'))
  }
  // console.log(promise2, x, resolve, reject);
  //别人写的promise可能调用成功后 还能调用失败
  //我可能写的promise 要和别人的兼容 考虑不是自己写的promise的情况
  if ((typeof x === 'object' && x !== null) || typeof x === 'function') {
    //有可能是promise
    let called = false;
    try {
      let then = x.then;
      if (typeof then == 'function') {
        //这里我就认为你是promise了 x.then这样写会触发getter可能会发生异常
        then.call(
          x,
          (y) => {
            if (called) { return }
            called = false;
            resolvePromise(promise2, y, resolve, reject);//知道解析他不是promise的位置
          },
          (r) => {//reason
            if (called) { return }
            called = false;
            reject(r);
          }
        );
      } else {
        resolve(x.then);
      }
    } catch (e) {
      if (called) { return }
      called = false;
      reject(e)
    }
  } else {
    //说明返回的是一个普通值 直接将他放到promise2.resolve中
    resolve(x);
  }
}

class Promise {
  constructor(executor) {
    this.status = PENDING; //promise默认的状态
    this.value = undefined; //成功的原因
    this.reason = undefined; //失败的原因
    this.onResolvedCallbacks = [];
    this.onRejectedCallback = [];
    const resolve = (value) => {
      if(value instanceof Promise){
        return value.then(resolve,reject);
      }
      //成功的resolve函数
      if (this.status === PENDING) {
        this.value = value;
        this.status = FULFILLED;
        this.onResolvedCallbacks.forEach((fn) => {
          fn();
        });
      }
    };

    const reject = (reason) => {
      //失败的函数
      if (this.status === PENDING) {
        this.status = REJECTED; //修改状态
        this.reason = reason;
        this.onRejectedCallback.forEach((fn) => {
          fn();
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
  //then中的参数是可选的
  then(onFulfilled, onRejected) {  //onFulfilled onRejected promise+规定的2个函数
    onFulfilled = typeof onFulfilled === "function" ? onFulfilled : v => v;
    onRejected = typeof onRejected === "function" ? onRejected : err => {throw err};
    let promise2 = new Promise((resolve, reject) => {
      if (this.status == FULFILLED) {
        //成功调用成功的方法
        //因为：resolvePromise里边用到了promise2 在new的时候还没有生成 所以要开另外的任何 settimeout或者setinterval 等
        setTimeout(() => {
          try {
            let x = onFulfilled(this.value);

            //此x 可能是一个promise 如果是promise需要看一下这个promise是成功还是失败 .then,如果是成功则把成功结果调用promise2的resolve传递进去，如果失败则同理

            //总结 x的值决定是调用promise2的resolve还是reject，如果是promise则取他的状态，如果是普通值则直接调用resolve
            // resolve(x);
            resolvePromise(promise2, x, resolve, reject);
          } catch (e) {
            reject(e);
          }
        }, 0);
      }
      if (this.status === REJECTED) {
        //失败调用失败的方法
        setTimeout(() => {
          try {
            let x = onRejected(this.reason);
            resolvePromise(promise2, x, resolve, reject);
          } catch (e) {
            reject(e);
          }
        }, 0);
      }
      if (this.status == PENDING) {
        //代码是异步调用resolve或者reject
        this.onResolvedCallbacks.push(() => {
          setTimeout(() => {
            try {
              let x = onFulfilled(this.value);
              resolvePromise(promise2, x, resolve, reject);
            } catch (e) {
              reject(e);
            }
          }, 0);
        });

        this.onRejectedCallback.push(() => {
          setTimeout(() => {
            try {
              let x = onRejected(this.reason);
              resolvePromise(promise2, x, resolve, reject); //只要返回的普通值都会走resolve
            } catch (e) {
              reject(e);
            }
          },0);
        });
      }
    });
    return promise2;
  }
  static resolve(value){
    return new Promise((resolve,reject)=>{
      resolve(value);
    })
  }
  static reject(value){
    return new Promise((resolve,reject)=>{
      reject(value);
    })
  }
  static all = (promises) => {
    let result = [];
    let times = 0;
    return new Promise((resolve, reject) => {
      const resolveData = (data, index) => {
        result[index] = data;
        if (++times == promises.length) {
          resolve(result)
        }
      }
      promises.forEach((v, index) => {//并发 多个请求一起执行的
        if (v && typeof v.then == 'function') {
          v.then((data) => { resolveData(data, index); }, reject)//如果其中某一个promise失败了 直接执行失败即可
        } else {
          resolveData(v, index);
        }
      })
    })
  }
  catch(errorFn){
    return this.then(null, errorFn);
  }
}

//导出测试
//npm install -g promises-aplus-tests
//延迟对象 帮我们减少一次套用 针对面前来说 应用不是很广泛
Promise.deferred = function () {
  let dfd = {};
  dfd.promise = new Promise((resolve,reject)=>{
    dfd.resolve = resolve;
    dfd.reject = reject;
  }) 
  return dfd;
}

module.exports = Promise;
