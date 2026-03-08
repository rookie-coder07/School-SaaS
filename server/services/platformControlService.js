export function createPlatformControlService({ db, controlState, clearCache = () => true }) {
  const persist = async (patch) => {
    Object.assign(controlState, patch, { updatedAt: new Date().toISOString() });
    await db.collection("systemSettings").updateOne(
      { key: "platformControl" },
      {
        $set: {
          key: "platformControl",
          ...patch,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
    return { ...controlState };
  };

  return {
    async enableMaintenance() {
      return persist({ maintenanceMode: true });
    },
    async disableMaintenance() {
      return persist({ maintenanceMode: false });
    },
    async disableUploads() {
      return persist({ uploadsDisabled: true });
    },
    async enableUploads() {
      return persist({ uploadsDisabled: false });
    },
    async forceLogoutAll() {
      const forceLogoutIssuedAfter = Math.floor(Date.now() / 1000);
      return persist({ forceLogoutIssuedAfter });
    },
    async clearCache() {
      clearCache();
      return true;
    },
    async setMaintenanceAndUploads({ maintenanceMode, uploadsDisabled }) {
      return persist({ maintenanceMode: Boolean(maintenanceMode), uploadsDisabled: Boolean(uploadsDisabled) });
    },
  };
}

