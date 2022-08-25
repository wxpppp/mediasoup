import { Logger } from './Logger';
import { RtpObserver, RtpObserverEvents, RtpObserverObserverEvents } from './RtpObserver';
import { Producer } from './Producer';
import { EnhancedEventEmitter } from './EnhancedEventEmitter';

export interface AudioLevelObserverOptions
{
	/**
	 * Maximum number of entries in the 'volumes”' event. Default 1.
	 */
	maxEntries?: number;

	/**
	 * Minimum average volume (in dBvo from -127 to 0) for entries in the
	 * 'volumes' event.	Default -80.
	 */
	threshold?: number;

	/**
	 * Interval in ms for checking audio volumes. Default 1000.
	 */
	interval?: number;

	/**
	 * Custom application data.
	 */
	appData?: Record<string, unknown>;
}

export interface AudioLevelObserverVolume
{
	/**
	 * The audio producer instance.
	 */
	producer: Producer;

	/**
	 * The average volume (in dBvo from -127 to 0) of the audio producer in the
	 * last interval.
	 */
	volume: number;
}

export type AudioLevelObserverEvents = RtpObserverEvents &
{
	volumes: [AudioLevelObserverVolume[]];
	silence: [];
}

export type AudioLevelObserverObserverEvents = RtpObserverObserverEvents & 
{
	volumes: [AudioLevelObserverVolume[]];
	silence: [];
}

const logger = new Logger('AudioLevelObserver');

export class AudioLevelObserver extends RtpObserver<AudioLevelObserverEvents>
{
	/**
	 * @private
	 */
	constructor(params: any)
	{
		super(params);

		this.handleWorkerNotifications();
	}

	/**
	 * Observer.
	 */
	get observer(): EnhancedEventEmitter<AudioLevelObserverObserverEvents>
	{
		return super.observer;
	}

	private handleWorkerNotifications(): void
	{
		this.channel.on(this.internal.rtpObserverId, (event: string, data?: any) =>
		{
			switch (event)
			{
				case 'volumes':
				{
					// Get the corresponding Producer instance and remove entries with
					// no Producer (it may have been closed in the meanwhile).
					const volumes: AudioLevelObserverVolume[] = data
						.map(({ producerId, volume }: { producerId: string; volume: number }) => (
							{
								producer : this.getProducerById(producerId),
								volume
							}
						))
						.filter(({ producer }: { producer: Producer }) => producer);

					if (volumes.length > 0)
					{
						this.safeEmit('volumes', volumes);

						// Emit observer event.
						this.observer.safeEmit('volumes', volumes);
					}

					break;
				}

				case 'silence':
				{
					this.safeEmit('silence');

					// Emit observer event.
					this.observer.safeEmit('silence');

					break;
				}

				default:
				{
					logger.error('ignoring unknown event "%s"', event);
				}
			}
		});
	}
}
