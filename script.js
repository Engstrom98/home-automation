class PlantMonitor {
    constructor() {
        this.plants = [];
        this.sortBy = 'name';
        this.lastUpdateTime = null;
        this.isOnline = false;
        this.isListView = false;
        this.statusFilter = null;
        
        this.initializeElements();
        this.bindEvents();
        this.loadMockData();
        this.startAutoRefresh();
    }

    initializeElements() {
        this.plantsGrid = document.getElementById('plantsGrid');
        this.refreshBtn = document.getElementById('refreshBtn');
        this.sortFilter = document.getElementById('sortFilter');
        this.viewToggleBtn = document.getElementById('viewToggleBtn');
        this.connectionStatus = document.getElementById('connectionStatus');
        this.lastUpdateEl = document.getElementById('lastUpdate');
        this.totalPlantsEl = document.getElementById('totalPlants');
        this.healthyPlantsEl = document.getElementById('healthyPlants');
        this.warningPlantsEl = document.getElementById('warningPlants');
        this.criticalPlantsEl = document.getElementById('criticalPlants');
        
        this.healthyCard = this.healthyPlantsEl.closest('.stat-card');
        this.warningCard = this.warningPlantsEl.closest('.stat-card');
        this.criticalCard = this.criticalPlantsEl.closest('.stat-card');
        this.totalCard = this.totalPlantsEl.closest('.stat-card');
    }

    bindEvents() {
        this.refreshBtn.addEventListener('click', () => this.refreshData());
        this.sortFilter.addEventListener('change', (e) => {
            this.sortBy = e.target.value;
            this.renderPlants();
        });
        this.viewToggleBtn.addEventListener('click', () => this.toggleView());
        
        this.healthyCard.addEventListener('click', () => this.filterByStatus('healthy'));
        this.warningCard.addEventListener('click', () => this.filterByStatus('warning'));
        this.criticalCard.addEventListener('click', () => this.filterByStatus('critical'));
        this.totalCard.addEventListener('click', () => this.clearFilter());
    }

    async loadMockData() {
        this.plants = this.generateMockData();
        this.renderPlants();
        this.updateStats();
        this.updateConnectionStatus(true);
    }

    generateMockData() {
        const plantNames = [
            'Monstera Deliciosa', 'Snake Plant', 'Peace Lily', 'Rubber Plant',
            'Fiddle Leaf Fig', 'Pothos', 'Spider Plant', 'ZZ Plant',
            'Philodendron', 'Aloe Vera', 'Boston Fern', 'Jade Plant'
        ];

        const locations = [
            'Living Room', 'Kitchen', 'Bedroom', 'Office',
            'Bathroom', 'Balcony', 'Dining Room', 'Study'
        ];

        return plantNames.map((name, index) => ({
            id: `esp32_${String(index + 1).padStart(3, '0')}`,
            name: name,
            location: locations[Math.floor(Math.random() * locations.length)],
            humidity: parseFloat((Math.random() * 100).toFixed(1)),
            lastReading: new Date(Date.now() - Math.random() * 3600000).toISOString(),
            batteryLevel: Math.floor(Math.random() * 100),
            temperature: (20 + Math.random() * 15).toFixed(1)
        }));
    }

    async refreshData() {
        this.showLoading();
        this.refreshBtn.disabled = true;
        this.refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';

        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            this.plants = this.plants.map(plant => ({
                ...plant,
                humidity: parseFloat(Math.max(0, Math.min(100, plant.humidity + (Math.random() - 0.5) * 20)).toFixed(1)),
                lastReading: new Date().toISOString(),
                batteryLevel: Math.max(0, plant.batteryLevel - Math.floor(Math.random() * 5)),
                temperature: (parseFloat(plant.temperature) + (Math.random() - 0.5) * 5).toFixed(1)
            }));

            this.renderPlants();
            this.updateStats();
            this.updateConnectionStatus(true);
            
        } catch (error) {
            console.error('Error refreshing data:', error);
            this.updateConnectionStatus(false);
        } finally {
            this.refreshBtn.disabled = false;
            this.refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Data';
        }
    }

    showLoading() {
        this.plantsGrid.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading plant data...</p>
            </div>
        `;
    }

    toggleView() {
        this.isListView = !this.isListView;
        
        if (this.isListView) {
            this.plantsGrid.classList.add('list-view');
            this.viewToggleBtn.innerHTML = '<i class="fas fa-list"></i> List View';
        } else {
            this.plantsGrid.classList.remove('list-view');
            this.viewToggleBtn.innerHTML = '<i class="fas fa-th-large"></i> Card View';
        }
        
        this.renderPlants();
    }

    filterByStatus(status) {
        this.statusFilter = this.statusFilter === status ? null : status;
        this.updateFilterUI();
        this.renderPlants();
    }
    
    clearFilter() {
        this.statusFilter = null;
        this.updateFilterUI();
        this.renderPlants();
    }
    
    updateFilterUI() {
        document.querySelectorAll('.stat-card').forEach(card => {
            card.classList.remove('active-filter');
        });
        
        if (this.statusFilter) {
            if (this.statusFilter === 'healthy') this.healthyCard.classList.add('active-filter');
            if (this.statusFilter === 'warning') this.warningCard.classList.add('active-filter');
            if (this.statusFilter === 'critical') this.criticalCard.classList.add('active-filter');
        }
    }

    renderPlants() {
        let plantsToRender = this.plants;
        
        if (this.statusFilter) {
            plantsToRender = this.plants.filter(plant => 
                this.getPlantStatus(plant.humidity) === this.statusFilter
            );
        }
        
        const sortedPlants = this.sortPlants(plantsToRender);
        
        if (sortedPlants.length === 0 && this.statusFilter) {
            this.plantsGrid.innerHTML = `
                <div class="no-plants-message">
                    <i class="fas fa-search"></i>
                    <h3>No ${this.statusFilter} plants found</h3>
                    <p>Click "Total Plants" to show all plants</p>
                </div>
            `;
        } else {
            this.plantsGrid.innerHTML = sortedPlants.map(plant => 
                this.createPlantCard(plant)
            ).join('');
        }
    }

    sortPlants(plants) {
        return [...plants].sort((a, b) => {
            switch (this.sortBy) {
                case 'humidity':
                    return b.humidity - a.humidity;
                case 'status':
                    return this.getStatusPriority(b) - this.getStatusPriority(a);
                case 'name':
                default:
                    return a.name.localeCompare(b.name);
            }
        });
    }

    getStatusPriority(plant) {
        const status = this.getPlantStatus(plant.humidity);
        const priorities = { critical: 3, warning: 2, healthy: 1 };
        return priorities[status] || 0;
    }

    getPlantStatus(humidity) {
        if (humidity < 20) return 'critical';
        if (humidity < 40) return 'warning';
        return 'healthy';
    }

    createPlantCard(plant) {
        const status = this.getPlantStatus(plant.humidity);
        const timeAgo = this.getTimeAgo(plant.lastReading);
        const humidityBarWidth = Math.max(5, plant.humidity);

        return `
            <div class="plant-card ${status}">
                <div class="plant-header">
                    <div class="plant-name">${plant.name}</div>
                    <div class="plant-status ${status}">${status}</div>
                </div>
                
                <div class="humidity-display">
                    <span class="humidity-value">${plant.humidity}%</span>
                    <div class="humidity-label">Soil Humidity</div>
                </div>
                
                <div class="humidity-bar">
                    <div class="humidity-fill" style="width: ${humidityBarWidth}%"></div>
                </div>
                
                <div class="plant-meta">
                    <div class="meta-item">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${plant.location}</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-thermometer-half"></i>
                        <span>${plant.temperature}°C</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-battery-half"></i>
                        <span>${plant.batteryLevel}%</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-clock"></i>
                        <span>${timeAgo}</span>
                    </div>
                </div>
            </div>
        `;
    }

    updateStats() {
        const total = this.plants.length;
        const healthy = this.plants.filter(p => this.getPlantStatus(p.humidity) === 'healthy').length;
        const warning = this.plants.filter(p => this.getPlantStatus(p.humidity) === 'warning').length;
        const critical = this.plants.filter(p => this.getPlantStatus(p.humidity) === 'critical').length;

        this.totalPlantsEl.textContent = total;
        this.healthyPlantsEl.textContent = healthy;
        this.warningPlantsEl.textContent = warning;
        this.criticalPlantsEl.textContent = critical;
    }

    updateConnectionStatus(online) {
        this.isOnline = online;
        this.connectionStatus.className = `status-dot ${online ? '' : 'offline'}`;
        this.lastUpdateTime = new Date();
        this.lastUpdateEl.textContent = `Last updated: ${this.formatTime(this.lastUpdateTime)}`;
    }

    getTimeAgo(timestamp) {
        const now = new Date();
        const past = new Date(timestamp);
        const diffMs = now - past;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return past.toLocaleDateString();
    }

    formatTime(date) {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    startAutoRefresh() {
        setInterval(() => {
            if (this.isOnline) {
                this.refreshData();
            }
        }, 1800000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PlantMonitor();
});

window.addEventListener('beforeunload', () => {
    console.log('Plant Monitor shutting down...');
});