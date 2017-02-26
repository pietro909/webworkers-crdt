
function start() {

	const width = window.innerWidth	
	const height = window.innerHeight - 200	
	const radius = 80
	const svg = Snap(width, height)
	const positions = [
		{x: radius*1.5, y:  radius*1.5 },
		{x: width - radius*1.5, y: radius*1.5 },
		{x: width/2, y: height - radius*2 }
	]

	const onMessage = ({ data }) => {
		switch(data.type) {

			case 'MY_STATE': {
				const from = nodes[data.from]
				const to = nodes[data.to]
				const msg = from.msg.clone().attr({
					opacity: 1,
					fill: '#f0624c',
					strokeWidth: 0
				}).prependTo(svg)
				msg.select('text').attr({
					text: `${data.value}, ${data.total}`,
					fill: '#000000'
				})
				const targetPosition = {
					x: to.circle.attr('cx') - from.circle.attr('cx'),
					y: to.circle.attr('cy') - from.circle.attr('cy')
				}
				msg.animate({
					transform: `t${targetPosition.x},${targetPosition.y}`,
				}, 1600, () => {
					msg.animate({ opacity: '0.0' }, 125)
					to.circle.animate({ opacity: '0.4' }, 125)
					setTimeout(() => to.circle.animate({ opacity: 1.0 }, 500),250)
					to.worker.postMessage(data)
					msg.remove()
				})
				break
			}

				/* UI messages are used only to give the user an immediate feedback on the UI,
				 * since the webworker can't access the DOM.
				 * Shouldn't exist in the CDRT since the update is 1-5 seconds, and that's why
				 * they're not used for the calculating totals.
				 */

			case 'UI:MY_VALUE': {
				const node = nodes[data.from]
				node.value.attr({ text: data.value.toString() })
				break
			}

			case 'UI:MY_TOTAL': {
				const node = nodes[data.from]
				node.total.attr({ text: `Total: ${data.total}`})
				break
			}
		}
	}

	const nodes = {}

	for (let i = 1; i < 4; i+=1) {
		let worker = run(actor, { id: i })
		worker.onmessage = onMessage
		svg.attr({
			fill: "#ffe298",
			stroke: "#000",
			strokeWidth: 1
		});
		const pos = positions[i-1]
		const msgCircle = svg.circle(pos.x,pos.y,30)
		const msgTxt = svg.text(pos.x,pos.y,'0, 0').attr({
			'text-anchor': 'middle',
			'alignment-baseline': 'middle'
		})
		const msg = svg.group(msgCircle, msgTxt).attr({ opacity: 0 })
		const circle = svg.circle(pos.x,pos.y,radius).attr({
			cursor: 'pointer'
		})
		const value = svg.text(pos.x,pos.y,'0').attr({
			'text-anchor': 'middle',
			fill: 'black',
			strokeWidth: 0.5
		})
		const total = svg.text(pos.x,pos.y+radius/2,'Total: 0').attr({ 'text-anchor': 'middle' })
		const clickMe = svg.text(pos.x,pos.y+radius*1.5,`Increment #${i}`).attr({
			'text-anchor': 'middle',
			stroke: 'black',
			fill: 'black',
			opacity: 0
		})
		const node = { worker, circle, msg, value, total }
		circle.click((me => () => onIncrement(me))(node))
		circle.mouseover((me => () => {
			me.attr({ opacity: 1 })
		})(clickMe))
		circle.mouseout((me => () => {
			me.attr({ opacity: 0 })
		})(clickMe))
		nodes[i] = node
	}

const onIncrement = node => {
	node.circle.animate({ transform: 's0.7' }, 125)
	setTimeout(() => node.circle.animate({ transform: 's1.0' }, 250, mina.bounce), 60)
	node.worker.postMessage({ type: 'INCREMENT' })
}

document.onkeypress = e => {
	const node = nodes[parseInt(e.key)]
	if (node) {
		onIncrement(node)
	}
}
}

const actor = options => {
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

	const next = () => Math.round((Math.random()*10))%4 || 1
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
				if (data.total > total) {
					total = data.total 
				}
				postMessage(myTotalForView(id, total))
				break
		}
	}
}


// from https://medium.com/@roman01la/run-web-worker-with-a-function-rather-than-external-file-303add905a0#.tqmx6rb1a
function run(fn, options) {
	// TODO: how to pass functions?
	return new Worker(URL.createObjectURL(new Blob([`(${fn})('${JSON.stringify(options)}')`])));
}
