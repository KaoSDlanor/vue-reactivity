import {
	Ref,
	computed,
	effectScope,
	onScopeDispose,
	watch,
} from 'vue';

/**
 * Creates a new effect scope for each key in an object, and runs a handler function for each key. Use this to more efficiently manage reactivity in deeply nested objects.
 * @param input a ref containing any object
 * @param handler a function that will be called for each key in the object, with the key as an argument. The function will be running inside a Vue effect scope tied to the key that will be destroyed when the key is removed.
 */
export const useScopePerKey = <O extends object>(
	input: Ref<O>,
	handler: (key: keyof O) => unknown
) => {
	const parentScope = effectScope();
	const childScopes = new Map<keyof O, ReturnType<typeof effectScope>>();

	parentScope.run(() => {
		const inputKeys = computed(() => Object.keys(input.value) as (keyof O)[]);
		watch(
			inputKeys,
			(inputKeys) => {
				const keysToAdd = inputKeys.filter((key) => !childScopes.has(key));

				for (const key of keysToAdd) {
					const newScope = effectScope();
					childScopes.set(key, newScope);
					newScope!.run(() => {
						handler(key);

						onScopeDispose(() => {
							if (!childScopes.has(key)) return;
							childScopes.get(key)!.stop();
							childScopes.delete(key);
						});
					});
				}
			},
			{ immediate: true, flush: 'sync' }
		);
	})!;

	return () => parentScope.stop();
};
