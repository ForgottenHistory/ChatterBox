class ServiceContainer {
    constructor() {
        this.services = new Map();
        this.singletons = new Map();
        console.log('ServiceContainer initialized');
    }

    // Register a service factory
    register(name, factory, options = {}) {
        this.services.set(name, {
            factory,
            singleton: options.singleton || false,
            dependencies: options.dependencies || []
        });
    }

    // Get a service instance
    get(name) {
        const serviceConfig = this.services.get(name);
        if (!serviceConfig) {
            throw new Error(`Service '${name}' not found`);
        }

        // Return singleton if already created
        if (serviceConfig.singleton && this.singletons.has(name)) {
            return this.singletons.get(name);
        }

        // Resolve dependencies
        const dependencies = serviceConfig.dependencies.map(dep => this.get(dep));

        // Create service instance
        const instance = serviceConfig.factory(...dependencies);

        // Store singleton
        if (serviceConfig.singleton) {
            this.singletons.set(name, instance);
        }

        return instance;
    }

    // Check if service exists
    has(name) {
        return this.services.has(name);
    }

    // Clear all singletons (for testing)
    clearSingletons() {
        this.singletons.clear();
    }
}

module.exports = new ServiceContainer();