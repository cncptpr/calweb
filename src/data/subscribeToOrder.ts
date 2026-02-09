import { TodoStore, Todo, Id, OrderSubscriber, getOrder } from "./todos";


export function subscribeToOrder(
    store: TodoStore,
    orderFn: (todos: Todo[]) => Id[],
    cb: (todos: Id[]) => void,
    lastOrder?: Id[]
): () => void {
    const subscriber: OrderSubscriber = {
        cb,
        orderFn,
        lastOrder: lastOrder ?? getOrder(store, orderFn),
    };
    store._orderSubscribers.add(subscriber);
    return function unsubscribe() {
        store._orderSubscribers.delete(subscriber);
    };
}
