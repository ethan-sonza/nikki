<script>
    import YouTube from 'svelte-youtube';
    import Modal from './Modal.svelte';
    import { lazyLoad } from '../helpers';

    export let videoId;
    let modal;

    const options = {
        height: '390',
        width: '640',
        playerVars: {
            autoplay: 1
        }
    };
</script>

<div class="preview">

    <img 
        use:lazyLoad={'https://img.youtube.com/vi/' + videoId + '/maxresdefault.jpg'}
        alt='youtube-preview'
        on:click="{() => modal.show()}"
    />

    <Modal
        bind:this={modal}
    >
        <YouTube videoId={videoId} options={options}/>
    </Modal>


    <YouTube videoId="Rh5tEDUxric"/>
</div>

<style>
</style>