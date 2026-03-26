# Buttons

The **SigPro** Button component wraps [DaisyUI 5](https://daisyui.com/components/button/) styles with native reactive logic.

## Basic Usage

<button class="btn btn-primary btn-secondary btn-accent btn-neutral btn-info btn-lg btn-sm btn-xs">Test</button>

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  if (typeof window === 'undefined') return;

  const init = () => {
    // 1. Esperamos a que el Core ($) y los helpers (Button, Div) existan
    if (!window.$ || !window.Button || !window.Input) {
      setTimeout(init, 100);
      return;
    }

    // 2. Usamos las funciones tal cual las crea tu Core (con Mayúscula inicial)
    const { $, Button, Input, Div, P, Span } = window;
const Mount = $.mount;
const HTML = $.html;
    // --- DEMO REACTIVA ---
    const nombre = $('Mundo');

    return Mount(
      Div({ class: 'flex flex-col gap-4' }, [
        // Usamos el helper Input de tu librería
        Input({ 
          class: 'input input-bordered input-primary w-full max-w-xs',
          value: nombre, // Tu Core maneja el binding si es una señal
          placeholder: 'Escribe tu nombre...'
        }),
        
        // El P y el Span también son helpers de tu Core
        P({ class: 'text-xl' }, [
          'Hola ', 
          Span({ class: 'text-primary font-bold' }, nombre), 
          '!'
        ])
      ]), 
      '#demo-input-simple'
    );
  };

  init();
})
</script>
