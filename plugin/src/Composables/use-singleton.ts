export function useSingleton<TInstance, TArgs extends any[]>(
    create: (...args: TArgs) => TInstance
): (...args: TArgs) => TInstance {
    let instance: TInstance | null = null;

    return function (...args) {
        if (! instance) {
            instance = create(...args);
        }
        return instance;
    }
}