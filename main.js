
const plus = n => ({ type: 'plus', value: n })

function start() {
  const ids = [ 'A', 'B', 'C' ]
  const nodes = ids.map(id => ({
    id: id,
    worker: run(node, { id })
  }))

  document.onkeypress = e => {
    switch(e.key) {
      case '1':
        nodes[0].worker.postMessage(plus(1))
        break
      case '2':
        nodes[1].worker.postMessage(plus(1))
        break
      case '3':
        nodes[2].worker.postMessage(plus(1)) 
        break
    }
  }
}

const node = options => {
  let state = 0

  const { id } = JSON.parse(options)
  const log = msg => {
    console.group(id)
    console.log(msg)
    console.groupEnd()
  }

  onmessage = msg => {
    switch(msg.data.type) {

      case 'plus':
        state += 1
        log(`state: ${state}`)
        break

      default:
        log(msg.data)
    }
  }
}


// from https://medium.com/@roman01la/run-web-worker-with-a-function-rather-than-external-file-303add905a0#.tqmx6rb1a
function run(fn, options) {
  return new Worker(URL.createObjectURL(new Blob([`(${fn})('${JSON.stringify(options)}')`])));
}
