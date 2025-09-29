// Supabase configuration with your actual keys
const SUPABASE_URL = 'https://cpyumwesqylqcfuzfrxg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNweXVtd2VzcXlscWNmdXpmcnhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMzM4MDMsImV4cCI6MjA3NDYwOTgwM30.Ddr63vI8zOGhIHZnGMDcQKo022305lRtyNyqgt4JScA';

// Initialize Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentVoter = null;

// Page elements
const loginPage = document.getElementById('loginPage');
const votingPage = document.getElementById('votingPage');
const successPage = document.getElementById('successPage');
const errorPage = document.getElementById('errorPage');
const loginForm = document.getElementById('loginForm');
const votingForm = document.getElementById('votingForm');
const loginMessage = document.getElementById('loginMessage');
const votingMessage = document.getElementById('votingMessage');
const voterEmailSpan = document.getElementById('voterEmail');
const errorText = document.getElementById('errorText');

// Candidate images (you can replace these URLs with actual image URLs)
const candidateImages = {
    boy1: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    boy2: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    girl1: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    girl2: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face'
};

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    console.log('Voting system initialized');
    
    // Test Supabase connection
    testSupabaseConnection();
    
    // Login form handler
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        await verifyVoter();
    });
    
    // Voting form handler
    votingForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        await submitVote();
    });
    
    // Improved click handlers for candidate selection
    document.addEventListener('click', function(e) {
        const candidateCard = e.target.closest('.candidate-card');
        if (candidateCard) {
            const radioInput = candidateCard.querySelector('input[type="radio"]');
            if (radioInput) {
                // Get all cards in the same section
                const container = candidateCard.closest('.candidates-grid');
                container.querySelectorAll('.candidate-card').forEach(card => {
                    card.classList.remove('selected');
                });
                
                // Select the clicked card
                candidateCard.classList.add('selected');
                radioInput.checked = true;
                
                // Add selection animation
                candidateCard.style.animation = 'none';
                setTimeout(() => {
                    candidateCard.style.animation = 'pulse 0.3s ease';
                }, 10);
            }
        }
    });
});

// Test Supabase connection
async function testSupabaseConnection() {
    try {
        const { data, error } = await supabase.from('voters').select('count');
        if (error) {
            console.error('Supabase connection test failed:', error);
            showError('Database connection failed. Please check setup.');
        } else {
            console.log('Supabase connected successfully');
        }
    } catch (error) {
        console.error('Connection test error:', error);
    }
}

// Load candidates from database
async function loadCandidates() {
    try {
        showVotingMessage('Loading candidates...', 'info');
        
        const { data, error } = await supabase
            .from('candidates')
            .select('*')
            .order('id');
            
        if (error) {
            throw new Error('Failed to load candidates: ' + error.message);
        }
        
        if (!data || data.length === 0) {
            throw new Error('No candidates found in database');
        }
        
        const boyCandidates = data.filter(c => c.type === 'boy');
        const girlCandidates = data.filter(c => c.type === 'girl');
        
        if (boyCandidates.length === 0 || girlCandidates.length === 0) {
            throw new Error('Please setup both boy and girl candidates in database');
        }
        
        renderCandidates(boyCandidates, girlCandidates);
        showVotingMessage('Please select one candidate from each category', 'info');
        
    } catch (error) {
        console.error('Error loading candidates:', error);
        showError(error.message);
    }
}

// Render candidates on voting page
function renderCandidates(boys, girls) {
    const boyContainer = document.getElementById('boyCandidates');
    const girlContainer = document.getElementById('girlCandidates');
    
    boyContainer.innerHTML = '';
    girlContainer.innerHTML = '';
    
    boys.forEach((candidate, index) => {
        const imageKey = `boy${index + 1}`;
        const card = createCandidateCard(candidate, imageKey, 'boy');
        boyContainer.appendChild(card);
    });
    
    girls.forEach((candidate, index) => {
        const imageKey = `girl${index + 1}`;
        const card = createCandidateCard(candidate, imageKey, 'girl');
        girlContainer.appendChild(card);
    });
}

// Create candidate card with image
function createCandidateCard(candidate, imageKey, type) {
    const card = document.createElement('div');
    card.className = 'candidate-card';
    card.innerHTML = `
        <input type="radio" name="${type}Candidate" value="${candidate.id}" id="${type}${candidate.id}">
        <div class="checkmark"></div>
        <img src="${candidateImages[imageKey]}" alt="${candidate.name}" class="candidate-image" 
             onerror="this.src='https://via.placeholder.com/150/667eea/ffffff?text=${candidate.name.charAt(0)}'">
        <div class="candidate-name">${candidate.name}</div>
        <div class="candidate-type">${type} candidate</div>
    `;
    return card;
}

// Verify voter email and code
async function verifyVoter() {
    const email = document.getElementById('email').value.trim().toLowerCase();
    const code = document.getElementById('code').value.trim();
    
    if (!email || !code) {
        showLoginMessage('Please enter both email and code', 'error');
        return;
    }
    
    const submitBtn = loginForm.querySelector('button');
    setButtonLoading(submitBtn, true);
    
    showLoginMessage('Verifying your credentials...', 'info');
    
    try {
        // Check if voter exists and code matches
        const { data, error } = await supabase
            .from('voters')
            .select('*')
            .eq('email', email)
            .eq('verification_code', code)
            .single();
            
        if (error) {
            if (error.code === 'PGRST116') {
                showLoginMessage('Invalid email or verification code!', 'error');
            } else {
                throw error;
            }
            return;
        }
        
        if (!data) {
            showLoginMessage('Invalid email or verification code!', 'error');
            return;
        }
        
        if (data.has_voted) {
            showLoginMessage('You have already voted!', 'error');
            return;
        }
        
        // Voter verified successfully
        currentVoter = data;
        voterEmailSpan.textContent = currentVoter.email;
        showLoginMessage('Verification successful! Loading voting page...', 'success');
        
        // Load candidates and show voting page
        setTimeout(async () => {
            await loadCandidates();
            showPage(votingPage);
        }, 1000);
        
    } catch (error) {
        console.error('Verification error:', error);
        showLoginMessage('Error verifying voter. Please try again.', 'error');
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

// Submit vote
async function submitVote() {
    const selectedBoy = document.querySelector('input[name="boyCandidate"]:checked');
    const selectedGirl = document.querySelector('input[name="girlCandidate"]:checked');
    
    if (!selectedBoy || !selectedGirl) {
        showVotingMessage('Please select one boy and one girl candidate!', 'error');
        return;
    }
    
    const submitBtn = votingForm.querySelector('button');
    setButtonLoading(submitBtn, true);
    
    showVotingMessage('Submitting your vote...', 'info');
    
    try {
        const boyId = parseInt(selectedBoy.value);
        const girlId = parseInt(selectedGirl.value);
        
        // Record the vote
        const { error: voteError } = await supabase
            .from('votes')
            .insert({
                voter_email: currentVoter.email,
                boy_candidate_id: boyId,
                girl_candidate_id: girlId,
                voted_at: new Date().toISOString()
            });
            
        if (voteError) throw voteError;
        
        // Mark voter as voted
        const { error: voterError } = await supabase
            .from('voters')
            .update({ has_voted: true })
            .eq('id', currentVoter.id);
            
        if (voterError) throw voterError;
        
        // Update candidate vote counts
        await updateCandidateVotes(boyId);
        await updateCandidateVotes(girlId);
        
        showVotingMessage('Vote submitted successfully!', 'success');
        
        setTimeout(() => {
            showPage(successPage);
            createConfetti();
        }, 1500);
        
    } catch (error) {
        console.error('Vote submission error:', error);
        showVotingMessage('Error submitting vote. Please try again.', 'error');
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

// Update candidate vote count
async function updateCandidateVotes(candidateId) {
    try {
        const { data: candidate } = await supabase
            .from('candidates')
            .select('votes')
            .eq('id', candidateId)
            .single();
            
        if (candidate) {
            await supabase
                .from('candidates')
                .update({ votes: candidate.votes + 1 })
                .eq('id', candidateId);
        }
    } catch (error) {
        console.error('Error updating candidate votes:', error);
    }
}

// Helper functions
function showPage(page) {
    loginPage.classList.remove('active');
    votingPage.classList.remove('active');
    successPage.classList.remove('active');
    errorPage.classList.remove('active');
    page.classList.add('active');
}

function showLoginMessage(message, type) {
    loginMessage.textContent = message;
    loginMessage.className = `message ${type}`;
}

function showVotingMessage(message, type) {
    votingMessage.textContent = message;
    votingMessage.className = `message ${type}`;
}

function showError(message) {
    errorText.textContent = message;
    showPage(errorPage);
}

function setButtonLoading(button, loading) {
    if (loading) {
        button.classList.add('loading');
        button.disabled = true;
    } else {
        button.classList.remove('loading');
        button.disabled = false;
    }
}

function createConfetti() {
    const confettiContainer = document.querySelector('.confetti');
    const emojis = ['🎉', '🎊', '⭐', '🎈', '🏆'];
    
    for (let i = 0; i < 10; i++) {
        const confetti = document.createElement('div');
        confetti.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        confetti.style.position = 'absolute';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.fontSize = (Math.random() * 20 + 15) + 'px';
        confetti.style.animation = `confetti ${Math.random() * 2 + 1}s ease-out forwards`;
        confetti.style.animationDelay = (Math.random() * 1) + 's';
        confettiContainer.appendChild(confetti);
        
        // Remove confetti after animation
        setTimeout(() => {
            confetti.remove();
        }, 3000);
    }
}

// Add CSS for pulse animation
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }
`;
document.head.appendChild(style);