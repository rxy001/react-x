#### `FiberRoot` 与 `RootFiber` 区别

1. `FiberRoot` 保存 `React` 运行时依赖的全局状态，与普通的 `Fiber Node` 结构不同。
2. `RootFiber` 与普通的 `Fiber Node` 结构一样，作为初始组件 (`<App />`) 的父组件，`Fiber Tree` 的起点。
3. `FiberRoot.current === RootFiber.stateNode`，因此每次 `render` 时可以轻松获得 `Fiber Tree` 起点，对其进行更新。
