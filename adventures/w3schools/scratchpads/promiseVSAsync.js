// let timeOutPromise = t => {
//   return new Promise((resolve, reject) => {
//     console.log('hello')
//     setTimeout(() => resolve('world'), t)
//   })
// }

// timeOutPromise(500).then(value => console.log(value))
// console.log('strange')

let simplePromise = new Promise((resolve, reject) => {
  resolve('simply done')
})

// could be written like simplePromise,
// but I opted for a simple function returning a Promise here.
let simpleBreakingPromise = () => {
  return new Promise((resolve, reject) => reject('SIMPLY BROKEN'))
}

let timeOutPromise = t => {
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve('world'), t)
    setTimeout(() => resolve('bud in'), t / 2)
    // resolve('super cheat')
    // simpleBreakingPromise().catch(reject)

    console.log('last line of timeOutPromise')
  })
}

let asyncWorld = async () => {
  console.log('hello')
  try {
    let response = await timeOutPromise(1000)
    console.log(response)
  } catch (e) {
    console.log(`CAUGHT error: ${e}`)
  }
}

let oldWorld = () => {
  console.log('hello')
  timeOutPromise(1000)
    .then(value => console.log(value))
    .catch(value => console.log(value))
}
// MAIN

// simplePromise.then(value => console.log(value)) // or then(console.log)
asyncWorld()
oldWorld()
console.log('finished')
