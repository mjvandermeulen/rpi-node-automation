function sharedClosure() {
  let counter = 0

  function plusOne() {
    let nextCounter = counter + 1
    console.log(`${counter} + 1 = ${nextCounter}`)
    counter = nextCounter
  }

  function plusFive() {
    let nextCounter = counter + 5
    console.log(`${counter} + 5 = ${nextCounter}`)
    counter = nextCounter
  }

  return { one: plusOne, two: plusFive }
}

let upByOne = sharedClosure().one
let upByFive = sharedClosure().two

console.log('start\n')
for (let i = 0; i < 3; i++) {
  upByOne()
  upByFive()
}
console.log('\n end')
