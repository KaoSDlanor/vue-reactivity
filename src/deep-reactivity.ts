import { Ref, effectScope, getCurrentScope, watchEffect } from 'vue';

/**
 * Creates a new effect scope for each key in an object, and runs a handler function for each key. Use this to more efficiently manage reactivity in deeply nested objects.
 * @param input a ref containing any object
 * @param handler a function that will be called for each key in the object, with the key as an argument. The function will be running inside a Vue effect scope tied to the key that will be destroyed when the key is removed.
 */
export const useScopePerKey = <O extends object>(
	input: Ref<O>,
	handler: (key: keyof O) => unknown
) => {
	const currentScope = getCurrentScope() ?? effectScope();
	const childScopes = new Map<keyof O, ReturnType<typeof effectScope>>();

	const stop = currentScope.run(() => {
		return watchEffect(() => {
			const inputKeys = Object.keys(input.value) as (keyof O)[];
			const runningKeys = Array.from(childScopes.keys());

			const keysToAdd = inputKeys.filter((key) => !runningKeys.includes(key));
			const keysToRemove = runningKeys.filter(
				(key) => !inputKeys.includes(key)
			);

			for (const key of keysToRemove) {
				if (!childScopes.has(key)) continue;
				childScopes.get(key)!.stop();
				childScopes.delete(key);
			}

			for (const key of keysToAdd) {
				if (childScopes.has(key)) continue;
				childScopes.set(key, effectScope());
				childScopes.get(key)!.run(() => {
					handler(key);
				});
			}
		});
	})!;

	return stop;
};
