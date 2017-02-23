
const increment = () => ({ type: 'INCREMENT' })

function start() {
  const log = msg => {
    console.group('main')
    console.log(msg)
    console.groupEnd()
  }
  const total = (to, value) => ({ type: 'TOTAL', to, value })

  const onMessage = ({ data }) => {
    switch(data.type) {
      
      case 'MY_VALUE': {
        const node = nodes[data.from]
        node.value = data.value
        const sum = nodes.reduce((acc, n) => acc+n.value, 0)
        node.element.innerText = `${node.value} - ${node.total}`
        node.worker.postMessage(total(data.to, sum))
        break
      }

      case 'MY_TOTAL': {
        const node = nodes[data.from]
        node.total = data.total
        node.element.innerText = `${node.value} - ${node.total}`
        break
      }

      default:
        console.error(data)
    }
  }

  const nodes = []
  for (let i = 0; i < 3; i+=1) {
    let worker = run(node, { id: i })
    worker.onmessage = onMessage
    const element = document.getElementById(`worker-${i}`)
    nodes.push({
      worker, value: 0, element, total: 0
    })
  }

  document.onkeypress = e => {
    switch(e.key) {
      case '1':
        nodes[0].worker.postMessage(increment())
        break
      case '2':
        nodes[1].worker.postMessage(increment())
        break
      case '3':
        nodes[2].worker.postMessage(increment()) 
        break
    }
  }
}

const node = options => {
  let state = 0
  let total = 0
  let timeout = null

  const { id } = JSON.parse(options)
  const log = msg => {
    console.group(id)
    console.log(msg)
    console.groupEnd()
  }

  const myValue = (from, to, value) => ({ type: 'MY_VALUE', from, to, value })
  const myTotal = (from, total) => ({ type: 'MY_TOTAL', from, total })
  // TODO: check against lower bound = 1000
  const next = () => Math.round((Math.random()*10))%3
  const sendTotalTo = to => {
    if (to !== id) {
      postMessage(myValue(id, to, state))
    }
    const when = Math.round((Math.random()*100000))%5000
    return setTimeout(() => sendTotalTo(next()), when)
  }
  sendTotalTo(next())

  onmessage = ({ data }) => {
    switch(data.type) {

      case 'INCREMENT':
        state += 1
        log(`state: ${state}`)
        break

      case 'TOTAL':
        if (data.value > total) {
          total = data.value
          postMessage(myTotal(id, total))
        }
        log(`total: ${state}`)
        break

      default:
        log(data)
    }
  }
}


// from https://medium.com/@roman01la/run-web-worker-with-a-function-rather-than-external-file-303add905a0#.tqmx6rb1a
function run(fn, options) {
  return new Worker(URL.createObjectURL(new Blob([`(${fn})('${JSON.stringify(options)}')`])));
}
