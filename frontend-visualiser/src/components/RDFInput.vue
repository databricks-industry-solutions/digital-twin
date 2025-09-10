<template>
  <codemirror
    v-model="code"
    mode="turtle"
    placeholder="Code goes here..."
    :style="{ height: '400px' }"
    :autofocus="true"
    :indent-with-tab="true"
    :tab-size="2"
    :extensions="extensions"
    @ready="handleReady"
    @change="log('change', $event)"
    @focus="log('focus', $event)"
    @blur="log('blur', $event)"
  />
</template>

<script>
  import { defineComponent } from 'vue'
  import { Codemirror } from 'vue-codemirror'
  import {ref,shallowRef,defineExpose} from 'vue'
  //import { javascript } from '@codemirror/lang-turtle'
  //import { oneDark } from '@codemirror/theme-one-dark'

  export default defineComponent({
    components: {
      Codemirror
    },
    setup() {
      const code = ref(`console.log('Hello, world!')`)
      const extensions = [ ]

      // Codemirror EditorView instance ref
      const view = shallowRef()
      const handleReady = (payload) => {
        view.value = payload.view
      }

      const getCodemirrorCode = () => {
      if (view.value) {
        return view.value.state.doc.toString()
      }
      return code.value // fallback if view is not yet ready
    }

      // Status is available at all times via Codemirror EditorView
      const getCodemirrorStates = () => {
        const state = view.value.state
        const ranges = state.selection.ranges
        const selected = ranges.reduce((r, range) => r + range.to - range.from, 0)
        const cursor = ranges[0].anchor
        const length = state.doc.length
        const lines = state.doc.lines
        // more state info ...
        // return ...
      }
      defineExpose({ getCodemirrorCode })
      return {
        code,
        extensions,
        getCodemirrorCode, 
        handleReady,
        log: console.log
      }
    }
  })
</script>