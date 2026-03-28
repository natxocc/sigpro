# Interactive Examples

Explore the power of SigPro through practical patterns. From basic reactivity to advanced composition.
NOTE: Here we use DaisyUI for styles.

---

## 1. Basic Reactivity
The classic counter. Notice how we use `$(0)` to create a signal and the `Button` tag helper to update it.

<div class="card bg-base-200 border border-base-300 shadow-sm my-6">
  <div class="card-body">
    <h3 class="card-title text-sm uppercase opacity-50 mb-4">Live Demo</h3>
    <div id="demo-counter" class="bg-base-100 p-6 rounded-xl border border-base-300 flex items-center justify-center"></div>
  </div>
</div>

```javascript
const Counter = () => {
  const $count = $(0);
  return Div({ class: 'flex gap-4 items-center' }, [
    Button({ class: 'btn btn-circle btn-outline', onclick: () => $count(c => c - 1) }, "-"),
    Span({ class: 'text-2xl font-mono w-12 text-center' }, $count),
    Button({ class: 'btn btn-circle btn-primary', onclick: () => $count(c => c + 1) }, "+")
  ]);
};
$mount(Counter, '#demo-counter');
```

---

## 2. Derived State (Computed)
Signals can depend on other signals. The "Double" value updates automatically.

<div class="card bg-base-200 border border-base-300 shadow-sm my-6">
  <div class="card-body">
    <h3 class="card-title text-sm uppercase opacity-50 mb-4">Live Demo</h3>
    <div id="demo-computed" class="bg-base-100 p-6 rounded-xl border border-base-300"></div>
  </div>
</div>

```javascript
const ComputedDemo = () => {
  const $count = $(10);
  const $double = $(() => $count() * 2);
  return Div({ class: 'space-y-4' }, [
    Input({ type: 'range', min: 1, max: 100, class: 'range range-primary', value: $count }),
    P({ class: 'text-center' }, ["Base: ", $count, " ⮕ ", Span({class: 'text-primary font-bold'}, ["Double: ", $double])])
  ]);
};
$mount(ComputedDemo, '#demo-computed');
```

---

## 3. Lists and Loops ($for)
SigPro handles lists efficiently, only updating specific DOM nodes.

<div class="card bg-base-200 border border-base-300 shadow-sm my-6">
  <div class="card-body">
    <h3 class="card-title text-sm uppercase opacity-50 mb-4">Live Demo</h3>
    <div id="demo-list" class="bg-base-100 p-6 rounded-xl border border-base-300"></div>
  </div>
</div>

```javascript
const ListDemo = () => {
  const $todos = $(['Learn SigPro', 'Build an App']);
  const $input = $("");
  const addTodo = () => {
    if ($input()) {
      $todos(prev => [...prev, $input()]);
      $input("");
    }
  };
  return Div([
    Div({ class: 'flex gap-2 mb-4' }, [
      Input({ class: 'input input-bordered flex-1', value: $input, placeholder: 'New task...' }),
      Button({ class: 'btn btn-primary', onclick: addTodo }, "Add")
    ]),
    Ul({ class: 'menu bg-base-200 rounded-box p-2' }, 
      $for($todos, (item) => Li([A(item)]), (item) => item)
    )
  ]);
};
$mount(ListDemo, '#demo-list');
```

---

## 4. Conditional Rendering ($if)
Toggle visibility without re-rendering the entire parent.

<div class="card bg-base-200 border border-base-300 shadow-sm my-6">
  <div class="card-body">
    <h3 class="card-title text-sm uppercase opacity-50 mb-4">Live Demo</h3>
    <div id="demo-if" class="bg-base-100 p-6 rounded-xl border border-base-300 flex justify-center"></div>
  </div>
</div>

```javascript
const ConditionalDemo = () => {
  const $isVisible = $(false);
  return Div({ class: 'text-center w-full' }, [
    Button({ class: 'btn btn-outline mb-4', onclick: () => $isVisible(! $isVisible()) }, "Toggle Secret"),
    $if($isVisible, 
      () => Div({ class: 'p-4 bg-warning text-warning-content rounded-lg shadow-inner' }, "🤫 SigPro is Awesome!"),
      () => Div({ class: 'p-4 opacity-50' }, "Nothing to see here...")
    )
  ]);
};
$mount(ConditionalDemo, '#demo-if');
```

---

## 5. Persistent State
Pass a string as a second argument to `$(val, key)` to sync with `localStorage`.

<div class="card bg-base-200 border border-base-300 shadow-sm my-6">
  <div class="card-body">
    <h3 class="card-title text-sm uppercase opacity-50 mb-4">Live Demo</h3>
    <div id="demo-persist" class="bg-base-100 p-6 rounded-xl border border-base-300"></div>
  </div>
</div>

```javascript
const PersistDemo = () => {
  const $name = $("Guest", "sigpro-demo-name");
  return Div({ class: 'flex flex-col gap-2' }, [
    H3({ class: 'text-lg font-bold' }, ["Hello, ", $name]),
    Input({ class: 'input input-bordered', value: $name, placeholder: 'Type your name...' }),
    P({ class: 'text-xs opacity-50' }, "Refresh the page to see magic!")
  ]);
};
$mount(PersistDemo, '#demo-persist');
```

<script>
  // Esta función envuelve todo para que Docsify lo ejecute correctamente
  (function() {
    const initExamples = () => {
      
      // 1. Counter
      const counterTarget = document.querySelector('#demo-counter');
      if (counterTarget && !counterTarget.hasChildNodes()) {
        const Counter = () => {
          const $count = $(0);
          return Div({ class: 'flex gap-4 items-center' }, [
            Button({ class: 'btn btn-circle btn-outline', onclick: () => $count(c => c - 1) }, "-"),
            Span({ class: 'text-2xl font-mono w-12 text-center' }, $count),
            Button({ class: 'btn btn-circle btn-primary', onclick: () => $count(c => c + 1) }, "+")
          ]);
        };
        $mount(Counter, counterTarget);
      }

      // 2. Computed
      const computedTarget = document.querySelector('#demo-computed');
      if (computedTarget && !computedTarget.hasChildNodes()) {
        const ComputedDemo = () => {
          const $count = $(10);
          const $double = $(() => $count() * 2);
          return Div({ class: 'space-y-4 w-full' }, [
            Input({ type: 'range', min: 1, max: 100, class: 'range range-primary', value: $count }),
            P({ class: 'text-center' }, ["Base: ", $count, " ⮕ ", Span({class: 'text-primary font-bold'}, ["Double: ", $double])])
          ]);
        };
        $mount(ComputedDemo, computedTarget);
      }

      // 3. List
      const listTarget = document.querySelector('#demo-list');
      if (listTarget && !listTarget.hasChildNodes()) {
        const ListDemo = () => {
          const $todos = $(['Learn SigPro', 'Build an App']);
          const $input = $("");
          const addTodo = () => { if ($input()) { $todos(prev => [...prev, $input()]); $input(""); } };
          return Div([
            Div({ class: 'flex gap-2 mb-4' }, [
              Input({ class: 'input input-bordered flex-1', value: $input, placeholder: 'New task...' }),
              Button({ class: 'btn btn-primary', onclick: addTodo }, "Add")
            ]),
            Ul({ class: 'menu bg-base-200 rounded-box p-2' }, $for($todos, (item) => Li([A(item)]), (item) => item))
          ]);
        };
        $mount(ListDemo, listTarget);
      }

      // 4. If
      const ifTarget = document.querySelector('#demo-if');
      if (ifTarget && !ifTarget.hasChildNodes()) {
        const ConditionalDemo = () => {
          const $isVisible = $(false);
          return Div({ class: 'text-center w-full' }, [
            Button({ class: 'btn btn-outline mb-4', onclick: () => $isVisible(! $isVisible()) }, "Toggle Secret"),
            $if($isVisible, 
              () => Div({ class: 'p-4 bg-warning text-warning-content rounded-lg' }, "🤫 SigPro is Awesome!"),
              () => Div({ class: 'p-4 opacity-50' }, "Nothing to see here...")
            )
          ]);
        };
        $mount(ConditionalDemo, ifTarget);
      }

      // 5. Persist
      const persistTarget = document.querySelector('#demo-persist');
      if (persistTarget && !persistTarget.hasChildNodes()) {
        const PersistDemo = () => {
          const $name = $("Guest", "sigpro-demo-name");
          return Div({ class: 'flex flex-col gap-2' }, [
            H3({ class: 'text-lg font-bold' }, ["Hello, ", $name]),
            Input({ class: 'input input-bordered', value: $name }),
            P({ class: 'text-xs opacity-50' }, "Refresh the page!")
          ]);
        };
        $mount(PersistDemo, persistTarget);
      }
    };

    // Ejecutar inmediatamente y también en cada navegación de Docsify
    initExamples();
    if (window.$docsify) {
      window.$docsify.plugins = [].concat(window.$docsify.plugins || [], (hook) => {
        hook.doneEach(initExamples);
      });
    }
  })();
</script>