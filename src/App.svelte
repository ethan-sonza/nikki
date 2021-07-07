<script>
	// Stores
	import { currentPage } from "./stores.js";

	// Pages
	import { About, Home, Videos} from './pages';

	// Components
	import Navbar from "./components/Navbar.svelte";
</script>

<main>
	<Navbar />

	{#if $currentPage === 'Home'}
		<Home />
	{:else if $currentPage === 'About'}
		<About />
	{:else if $currentPage === 'Videos'}
		<Videos />
	{/if}

</main>

<style>

</style>