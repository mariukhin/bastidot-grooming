import {Router} from "express";


export const timeRouter = Router();

timeRouter.get('/', (req, res) => {
    const tzValue = req.query.tz;

    if (!tzValue || typeof tzValue !== 'string') {
        return res.status(400).json({ error: 'tz query parameter is required and must be a string' });
    }

    let result;
    try {
        result = new Intl.DateTimeFormat('uk-UA', { timeZone: tzValue, dateStyle: 'long', timeStyle: 'short' }).format();
    } catch (e) {
        if (e instanceof RangeError) {
            return res.status(400).json({ error: 'Invalid timezone' });
        }
        return res.status(500).json({ error: 'Error occurred' });
    }
    return res.status(200).json({ status: 'ok', formattedDate: result });
});