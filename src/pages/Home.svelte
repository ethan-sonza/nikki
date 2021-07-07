<script>
    import { onMount } from 'svelte';
    import { fade } from 'svelte/transition';
    import { Section, YouTubePreview } from '../components';
    import { lazyLoad } from '../helpers';

    let visible = false;

    onMount(async () => {
		visible = true
	});
</script>

<Section>
    {#if visible}
        <img id='landing-person' transition:fade="{{ duration: 2000 }}" use:lazyLoad={'/images/landing1.jpg'} alt='landing-person' />
    {/if}
</Section>

<div>
    <YouTubePreview videoId="Rh5tEDUxric" />
</div>


<style>
    img#landing-person {
        margin-left: 10%;
    }
</style>