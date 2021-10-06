export default class History<V = any> extends Map<string, V> {
	serialize(): string {
		return JSON.stringify([...this])
	}

	load(entries: [string, V][]) {
		entries.forEach(([k, v]) => this.set(k, v))
	}
}

export class PrunableHistory extends History<number> {
	prune(millis: number) {
		const threshold = new Date().valueOf() - millis
		this.forEach((v, k) => v < threshold && this.delete(k))
	}
}
