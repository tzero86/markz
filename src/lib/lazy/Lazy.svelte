<script lang="ts">
  import type { Component } from "svelte";

  interface Props {
    /** Dynamic import of the component to mount. */
    loader: () => Promise<{ default: Component<any, any, any> }>;
    /** Overlay visibility; drives the import and is forwarded as a binding. */
    open?: boolean;
    [key: string]: unknown;
  }

  let { loader, open = $bindable(false), ...rest }: Props = $props();

  let Loaded = $state<Component<any, any, any> | null>(null);
  let loading = false;

  // Overlays are closed on startup, so their modules must stay out of the eager
  // graph until the user actually opens one.
  $effect(() => {
    if (!open || Loaded || loading) return;
    loading = true;
    loader()
      .then((mod) => (Loaded = mod.default))
      // A chunk that fails to load leaves the overlay closed, which is a state
      // the app already handles; an unhandled rejection would log instead.
      .catch(() => (loading = false));
  });
</script>

{#if Loaded}
  <Loaded {...rest} bind:open={open} />
{/if}
