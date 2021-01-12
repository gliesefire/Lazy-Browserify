class PackageMetadata {
    constructor(action, name, version, path) {
        this.action = action;
        this.name = name;
        this.version = version;
        this.path = path;
    }
}

class UpdatedPackageMetadata extends PackageMetadata {
    constructor(name, version, path, previousVersion) {
        super('update', name, version, path);
        this.previousVersion = previousVersion;
    }
}

class AddedPackageMetadata extends PackageMetadata {
    constructor(name, version, path) {
        super('add', name, version, path);
    }
}
class FailedPackageMetadata extends PackageMetadata {
    constructor(name, version, path) {
        super('fail', name, version, path);
    }
}
class MovedPackageMetadata extends PackageMetadata {
    constructor(name, version, path) {
        super('move', name, version, path);
    }
}
class WarningPackageMetadata extends PackageMetadata {
    constructor(name, version, path) {
        super('warn', name, version, path);
    }
}

class RemovedPackageMetadata extends PackageMetadata {
    constructor(name, version, path) {
        super('remove', name, version, path);
    }
}

class NpmInstallOutput {
    constructor(
        added = [new AddedPackageMetadata()], removed = [new RemovedPackageMetadata()], updated = [new UpdatedPackageMetadata()], moved = [new MovedPackageMetadata()], failed = [new FailedPackageMetadata()], warnings = [new WarningPackageMetadata()], audit = new AuditingResult(), funding = '0 Packages are looking for funding', elapsed = 0
    ) {
        this.added = added;
        this.removed = removed;
        this.updated = updated;
        this.moved = moved;
        this.failed = failed;
        this.warnings = warnings;
        this.audit = audit;
        this.funding = funding;
        this.elapsed = elapsed;
    }

    static fromJson(input) {
        return new NpmInstallOutput(
            input.added, input.removed, input.updated, input.moved, input.failed, input.warnings, input.audit, input.funding, input.elapsed
        );
    }
}

class AuditingResult {
    constructor(actions, advisories, muted, metadata = new Metadata()) {
        this.actions = actions;
        this.advisories = advisories;
        this.muted = muted;
        this.metadata = metadata;
    }
}

class Metadata {
    constructor(vulnerabilities = new Vulnerability(), dependencies = 0, devDependencies = 0, optionalDependencies = 0, totalDependencies = 0) {
        this.vulnerabilities = vulnerabilities;
        this.dependencies = dependencies;
        this.devDependencies = devDependencies;
        this.optionalDependencies = optionalDependencies;
        this.totalDependencies = totalDependencies;
    }
}

class Vulnerability {
    constructor(info = 0, low = 0, moderate = 0, high = 0, critical = 0) {
        this.info = info;
        this.low = low;
        this.moderate = moderate;
        this.high = high;
        this.critical = critical;
    }
}

module.exports = {
    NpmInstallOutput,
    PackageMetadata
}