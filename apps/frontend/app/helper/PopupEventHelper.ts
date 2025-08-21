export class PopupEventHelper {
	private static dismissedEvents: Set<string> = new Set();

	static dismiss(id?: string | null) {
		if (id) {
			this.dismissedEvents.add(String(id));
		}
	}

	static isDismissed(id?: string | null) {
		return id ? this.dismissedEvents.has(String(id)) : false;
	}

	static getAll(): Set<string> {
		return new Set(this.dismissedEvents);
	}

	static reset() {
		this.dismissedEvents.clear();
	}
}
