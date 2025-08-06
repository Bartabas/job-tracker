// frontend/app.js

document.addEventListener('DOMContentLoaded', () => {
    // --- THEME TOGGLE LOGIC ---
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeToggleDarkIcon = document.getElementById('theme-toggle-dark-icon');
    const themeToggleLightIcon = document.getElementById('theme-toggle-light-icon');
    const applyTheme = (theme) => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            themeToggleLightIcon.classList.remove('hidden');
            themeToggleDarkIcon.classList.add('hidden');
            localStorage.setItem('color-theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            themeToggleDarkIcon.classList.remove('hidden');
            themeToggleLightIcon.classList.add('hidden');
            localStorage.setItem('color-theme', 'light');
        }
    };
    const savedTheme = localStorage.getItem('color-theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme) { applyTheme(savedTheme); } else { applyTheme(systemPrefersDark ? 'dark' : 'light'); }
    themeToggleBtn.addEventListener('click', () => {
        const newTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
        applyTheme(newTheme);
    });

    // --- APPLICATION FUNCTIONALITY ---

    // --- Get Elements for Modal and Form ---
    const addJobModal = document.getElementById('add-job-modal');
    const addJobBtn = document.getElementById('add-job-btn');
    const cancelAddJobBtn = document.getElementById('cancel-add-job');
    const addJobForm = document.getElementById('add-job-form');

    // --- Event Listeners to Show/Hide Modal ---
    addJobBtn.addEventListener('click', () => addJobModal.classList.remove('hidden'));
    cancelAddJobBtn.addEventListener('click', () => addJobModal.classList.add('hidden'));
    addJobModal.addEventListener('click', (e) => {
        // Close modal if user clicks on the background overlay
        if (e.target === addJobModal) {
            addJobModal.classList.add('hidden');
        }
    });

    // --- RENDER A SINGLE JOB CARD ---
    const renderJobCard = (job) => {
        // Find the correct column to place the card in
        const jobList = document.querySelector(`.job-list[data-status='${job.status}']`);
        if (!jobList) return;

        const card = document.createElement('div');
        card.dataset.id = job.id;
        card.className = 'job-card bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700';
        
        // Only show the link icon if a URL exists
        const urlLink = job.url ? `
            <a href="${job.url}" target="_blank" class="text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400" title="View Job Post">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path d="M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.977-1.138 2.5 2.5 0 01-.142-3.665l3-3z" /><path d="M8.603 16.103a4 4 0 005.656-5.656l-1.225-1.224a.75.75 0 00-1.061-1.06l-1.224 1.224a2.5 2.5 0 01-3.536-3.536l3-3a2.5 2.5 0 013.536 3.536.75.75 0 001.138-.977a4 4 0 00-5.865-.225l-3 3a4 4 0 005.656 5.656z" /></svg>
            </a>` : '';

        card.innerHTML = `
            <div class="flex justify-between items-start">
                <h3 class="font-semibold text-slate-900 dark:text-white">${job.title}</h3>
                ${urlLink}
            </div>
            <p class="text-sm text-slate-600 dark:text-slate-300 mt-1">${job.company}</p>
            <p class="text-xs text-slate-400 dark:text-slate-500 mt-3">Applied: ${new Date(job.date_applied).toLocaleDateString()}</p>
        `;
        // *** THE FIX IS HERE: Changed appendChild to prepend ***
        // This adds the new card to the top of the list, making it immediately visible.
        jobList.prepend(card);
    };

    // --- FETCH ALL JOBS FROM API AND DISPLAY THEM ---
    const fetchJobs = async () => {
        try {
            const response = await fetch('/api/jobs');
            if (!response.ok) throw new Error('Failed to fetch jobs');
            const jobs = await response.json();
            
            // Clear existing cards before rendering new ones
            document.querySelectorAll('.job-list').forEach(list => list.innerHTML = '');
            
            // Render a card for each job
            jobs.forEach(renderJobCard);
        } catch (error) {
            console.error('Error fetching jobs:', error);
        }
    };

    // --- HANDLE THE 'ADD APPLICATION' FORM SUBMISSION ---
    addJobForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(addJobForm);
        const jobData = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/api/jobs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(jobData),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create job');
            }
            // The API returns the new job, but we'll re-fetch everything
            // to ensure the UI is perfectly in sync with the backend.
            await response.json();
            
            fetchJobs(); // Re-fetch and render all jobs.
            addJobForm.reset(); // Clear the form fields
            addJobModal.classList.add('hidden'); // Hide the modal
        } catch (error) {
            console.error('Error creating job:', error);
            alert(`Failed to save application: ${error.message}`);
        }
    });

    // --- Initial fetch of jobs when the page loads ---
    fetchJobs();
});
