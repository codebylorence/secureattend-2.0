import absentMarkingService from '../services/absentMarkingService.js';

/**
 * POST /api/absent-marking/start
 * Start the automatic absent marking and missed clock-out service
 */
export const startAbsentMarking = async (req, res) => {
    try {
        absentMarkingService.start();
        
        res.status(200).json({
            message: 'Absent marking and missed clock-out service started',
            status: absentMarkingService.getStatus()
        });
    } catch (error) {
        console.error('❌ Error starting absent marking service:', error.message);
        res.status(500).json({
            error: 'Failed to start absent marking and missed clock-out service',
            details: error.message
        });
    }
};

/**
 * POST /api/absent-marking/stop
 * Stop the automatic absent marking and missed clock-out service
 */
export const stopAbsentMarking = async (req, res) => {
    try {
        absentMarkingService.stop();
        
        res.status(200).json({
            message: 'Absent marking and missed clock-out service stopped',
            status: absentMarkingService.getStatus()
        });
    } catch (error) {
        console.error('❌ Error stopping absent marking service:', error.message);
        res.status(500).json({
            error: 'Failed to stop absent marking and missed clock-out service',
            details: error.message
        });
    }
};

/**
 * GET /api/absent-marking/status
 * Get the status of the absent marking and missed clock-out service
 */
export const getAbsentMarkingStatus = async (req, res) => {
    try {
        const status = absentMarkingService.getStatus();
        
        res.status(200).json({
            message: 'Absent marking and missed clock-out service status',
            ...status
        });
    } catch (error) {
        console.error('❌ Error getting absent marking status:', error.message);
        res.status(500).json({
            error: 'Failed to get absent marking and missed clock-out service status',
            details: error.message
        });
    }
};

/**
 * POST /api/absent-marking/run-now
 * Manually trigger absent marking and missed clock-out processing (for testing)
 */
export const runAbsentMarkingNow = async (req, res) => {
    try {
        console.log('🔄 Manual absent marking and missed clock-out processing triggered via API');
        const result = await absentMarkingService.markAbsentEmployees();
        
        res.status(200).json({
            message: 'Absent marking and missed clock-out processing completed',
            markedAbsent: result.markedAbsent || 0,
            markedMissedClockOut: result.markedMissedClockOut || 0,
            totalProcessed: (result.markedAbsent || 0) + (result.markedMissedClockOut || 0)
        });
    } catch (error) {
        console.error('❌ Error running absent marking:', error.message);
        res.status(500).json({
            error: 'Failed to run absent marking and missed clock-out processing',
            details: error.message
        });
    }
};