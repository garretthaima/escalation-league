import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { updateLeague } from '../../api/leaguesApi';
import { useToast } from '../context/ToastContext';

const EditLeagueModal = ({ show, onHide, league, onUpdate }) => {
    const { showToast } = useToast();
    const [formData, setFormData] = useState({
        name: '',
        start_date: '',
        end_date: '',
        description: '',
        max_players: '',
        is_active: false,
        points_per_win: 3,
        points_per_loss: 0,
        points_per_draw: 1,
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (league) {
            setFormData({
                name: league.name || '',
                start_date: league.start_date ? league.start_date.split('T')[0] : '',
                end_date: league.end_date ? league.end_date.split('T')[0] : '',
                description: league.description || '',
                max_players: league.max_players || '',
                is_active: league.is_active === 1 || league.is_active === true,
                points_per_win: league.points_per_win ?? 3,
                points_per_loss: league.points_per_loss ?? 0,
                points_per_draw: league.points_per_draw ?? 1,
            });
        }
    }, [league]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Convert is_active to tinyint (0 or 1) for backend
            const dataToSubmit = {
                ...formData,
                is_active: formData.is_active ? 1 : 0,
                max_players: formData.max_players ? parseInt(formData.max_players) : null,
                points_per_win: parseInt(formData.points_per_win),
                points_per_loss: parseInt(formData.points_per_loss),
                points_per_draw: parseInt(formData.points_per_draw),
            };

            await updateLeague(league.id, dataToSubmit);
            showToast('League updated successfully!', 'success');
            onUpdate(); // Refresh league list
            onHide(); // Close modal
        } catch (error) {
            console.error('Error updating league:', error);
            showToast('Failed to update league. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide} size="lg">
            <Modal.Header closeButton>
                <Modal.Title>Edit League</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3">
                        <Form.Label>League Name</Form.Label>
                        <Form.Control
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                        />
                    </Form.Group>

                    <div className="row">
                        <div className="col-md-6">
                            <Form.Group className="mb-3">
                                <Form.Label>Start Date</Form.Label>
                                <Form.Control
                                    type="date"
                                    name="start_date"
                                    value={formData.start_date}
                                    onChange={handleChange}
                                    required
                                />
                            </Form.Group>
                        </div>
                        <div className="col-md-6">
                            <Form.Group className="mb-3">
                                <Form.Label>End Date</Form.Label>
                                <Form.Control
                                    type="date"
                                    name="end_date"
                                    value={formData.end_date}
                                    onChange={handleChange}
                                    required
                                />
                            </Form.Group>
                        </div>
                    </div>

                    <Form.Group className="mb-3">
                        <Form.Label>Description</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={3}
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Max Players</Form.Label>
                        <Form.Control
                            type="number"
                            name="max_players"
                            value={formData.max_players}
                            onChange={handleChange}
                            min="1"
                        />
                        <Form.Text className="text-muted">
                            Leave blank for unlimited players
                        </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Check
                            type="checkbox"
                            name="is_active"
                            label="Active League"
                            checked={formData.is_active}
                            onChange={handleChange}
                        />
                        <Form.Text className="text-muted">
                            Only one league can be active at a time
                        </Form.Text>
                    </Form.Group>

                    <hr />
                    <h5 className="mb-3">Points Settings</h5>

                    <div className="row">
                        <div className="col-md-4">
                            <Form.Group className="mb-3">
                                <Form.Label>Points per Win</Form.Label>
                                <Form.Control
                                    type="number"
                                    name="points_per_win"
                                    value={formData.points_per_win}
                                    onChange={handleChange}
                                    min="0"
                                    required
                                />
                            </Form.Group>
                        </div>
                        <div className="col-md-4">
                            <Form.Group className="mb-3">
                                <Form.Label>Points per Loss</Form.Label>
                                <Form.Control
                                    type="number"
                                    name="points_per_loss"
                                    value={formData.points_per_loss}
                                    onChange={handleChange}
                                    min="0"
                                    required
                                />
                            </Form.Group>
                        </div>
                        <div className="col-md-4">
                            <Form.Group className="mb-3">
                                <Form.Label>Points per Draw</Form.Label>
                                <Form.Control
                                    type="number"
                                    name="points_per_draw"
                                    value={formData.points_per_draw}
                                    onChange={handleChange}
                                    min="0"
                                    required
                                />
                            </Form.Group>
                        </div>
                    </div>

                    <div className="d-flex justify-content-end gap-2">
                        <Button variant="secondary" onClick={onHide} disabled={loading}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </Form>
            </Modal.Body>
        </Modal>
    );
};

export default EditLeagueModal;
