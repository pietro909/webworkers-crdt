const makeUIWorker = (id, value, total) => {
	const div = document.createElement('div');
	div.innerHTML = `
		<div class="bagde">
			<h1>${id}</h1>
			<span>Value: <span id="value">${value}</span></span>
			<span>Total: <span id="total">${total}</span></span>
		</div>
   	<svg id="worker-${id}"></svg>
		`
	return div
}

const updateValue = (uiWorker, value) => {
	const p = uiWorker.querySelector('#value')
	p.innerText = value
}

const updateTotal = (uiWorker, total) => {
	const p = uiWorker.querySelector('#total')
	p.innerText = total
}

const increment = () => ({ type: 'INCREMENT' })
//const total = (to, value) => ({ type: 'TOTAL', to, value })

function start() {

  const onMessage = ({ data }) => {
    switch(data.type) {

      case 'MY_STATE': {
        const node = nodes[data.to]
        node.worker.postMessage(data)
				node
        break
      }

      /* UI messages are used only to give the user an immediate feedback on the UI,
       * since the webworker can't access the DOM.
       * Shouldn't exist in the CDRT since the update is 1-5 seconds, and that's why they're not
       * used for the CRDT algorithm.
       */

      case 'UI:MY_VALUE':
        const node = nodes[data.from]
        node.value = data.value
				updateValue(node.dom, data.value)
        break
      
      case 'UI:MY_TOTAL': {
        const node = nodes[data.from]
				updateTotal(node.dom, data.total)
        break
      }

      default:
        console.error(data)
    }
  }

  const nodes = []
	const nodesContainer = document.getElementById('nodes-container')
  for (let i = 0; i < 3; i+=1) {
    let worker = run(node, { id: i })
    worker.onmessage = onMessage
		const dom = makeUIWorker(i, 0, 0)
		nodesContainer.appendChild(dom)
    const element = Snap(`#worker-${i}`)
    element.circle(80,80,80)
    element.attr({
      fill: "#bada55",
      stroke: "#000",
      strokeWidth: 1
    });
    nodes.push({ worker, element, dom })
  }

	const animateNode = node => {
		node.element.transform('r20,50,50')
		setTimeout(() => node.element.transform('S1.0'), 1000)
	}

  document.onkeypress = e => {
		const node = nodes[parseInt(e.key)-1]
		if (node) {
			animateNode(node)
			node.worker.postMessage(increment())
		}
  }
}

const node = options => {
  const { id } = JSON.parse(options)

  let value = 0
  let total = 0
	const siblings = {}

  const myState = (to, value, total) => ({
		from: id,
		to,
		total,
		type: 'MY_STATE',
		value
	})


  const myTotalForView = (from, total) => ({ type: 'UI:MY_TOTAL', from, total })
  const myValueForView = (from, value) => ({ type: 'UI:MY_VALUE', from, value })

  const next = () => Math.round((Math.random()*10))%3
  const when = () => {
    const t = Math.round((Math.random()*100000))%5000
    return (t < 1000) ? when() : t
  }
  const sendTotalTo = to => {
    if (to !== id) {
      postMessage(myState(to, value, total))
    }
    return setTimeout(() => sendTotalTo(next()), when())
  }
  sendTotalTo(next())

  onmessage = ({ data }) => {
    switch(data.type) {

      case 'INCREMENT':
        value += 1
        postMessage(myValueForView(id, value))
				total += 1
				postMessage(myTotalForView(id, total))
        break

      case 'MY_STATE':
				siblings[data.from]	= data.value
        total = Object.values(siblings).reduce((acc, n) => acc+n, 0) + value
        postMessage(myTotalForView(id, total))
        break

      default:
        console.error(data)
    }
  }
}


// from https://medium.com/@roman01la/run-web-worker-with-a-function-rather-than-external-file-303add905a0#.tqmx6rb1a
function run(fn, options) {
  // TODO: how to pass functions?
  return new Worker(URL.createObjectURL(new Blob([`(${fn})('${JSON.stringify(options)}')`])));
}
